import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from 'next/server';
import { DRY_RUN, MOCK_EMERGENCY_TOKEN, MOCK_ACTIVE_TOKENS } from '@/lib/dry-run/mock-data';

import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  createEmergencyToken,
  logEmergencyAction,
  getActiveTokensForProfile,
  regenerateToken,
  markTokenPrinted,
  revokeToken,
  revokeAllActiveTokensForProfile,
} from '@/../../packages/db';
import type { UserDocument } from '@/../../packages/db/users';
import type { ProfileDocument } from '@/../../packages/db/profiles';
import { getDbClient } from '@/lib/server/db';
import { resolveBaseUrl } from '@/lib/utils/url';

// Rate limiting map (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxRequests: number = 3, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function getClientInfo(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ip, userAgent };
}

export async function POST(req: NextRequest) {
  // ── DRY RUN ────────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    const baseUrl = resolveBaseUrl(req);
    const mockUrl = `${baseUrl}/emergency/dry-run-token-abc123`;
    const mockQr = await QRCode.toDataURL(mockUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
    }).catch(() => MOCK_EMERGENCY_TOKEN.qrCode);

    return NextResponse.json({
      ...MOCK_EMERGENCY_TOKEN,
      url: mockUrl,
      qrCode: mockQr,
      isPermanent: true,
    });
  }
  // ───────────────────────────────────────────────────────────────────────────
  try {
    // Get authenticated session
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { ip, userAgent } = getClientInfo(req);
    
    // Find user
    const db = await getDbClient();
    const usersCollection = db.collection<UserDocument>('users');
    const user = await usersCollection.findOne({ email: authUser.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Rate limiting
    if (!checkRateLimit(user._id.toString(), 3, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before generating a new token.' },
        { status: 429 }
      );
    }
    
    // Get body
    const body = await req.json().catch(() => ({}));
    const { regenerate = false, oldToken = null } = body;
    const profileId = body.profileId || user._id.toString();
    
    // Validate profileId (which is actually the user's ID in this system)
    let profileObjectId: ObjectId;
    try {
      profileObjectId = new ObjectId(profileId);
    } catch (error) {
      if (user._id) {
        profileObjectId = user._id;
      } else {
        return NextResponse.json(
          { error: 'Invalid profileId' },
          { status: 400 }
        );
      }
    }
    
    // Verify the profileId matches the user's ID (since profiles are embedded in users)
    if (!user._id.equals(profileObjectId)) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 403 }
      );
    }
    
    // Generate cryptographically secure token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Resolve dynamic environment-aware base URL
    const baseUrl = resolveBaseUrl(req);
    const emergencyUrl = `${baseUrl}/emergency/${token}`;

    let tokenId: ObjectId;
    
    // If regenerating or oldToken provided, revoke previous token
    if (regenerate || oldToken) {
      if (oldToken) {
        const oldTokenHash = crypto
          .createHash('sha256')
          .update(oldToken)
          .digest('hex');
        await revokeToken(oldTokenHash);
        await revokeToken(oldToken);
      }
      if (regenerate) {
        await revokeAllActiveTokensForProfile(profileObjectId.toString());
      }
      
      const newTokenId = await createEmergencyToken(
        user._id,
        profileObjectId,
        tokenHash,
        true, // isPermanent standard
        {
          createdIp: ip,
          createdUserAgent: userAgent,
          token,
          url: emergencyUrl,
          regenerated: true,
        }
      );
      
      tokenId = newTokenId;
      
      // Log regeneration
      await logEmergencyAction(
        user._id,
        profileObjectId,
        'token_created',
        ip,
        userAgent,
        tokenHash,
        {
          tokenId: tokenId.toString(),
          regenerated: true,
          oldToken,
        }
      );
    } else {
      // Create new permanent token in database
      tokenId = await createEmergencyToken(
        user._id,
        profileObjectId,
        tokenHash,
        true, // isPermanent standard
        {
          createdIp: ip,
          createdUserAgent: userAgent,
          token,
          url: emergencyUrl,
        }
      );
      
      // Log action
      await logEmergencyAction(
        user._id,
        profileObjectId,
        'token_created',
        ip,
        userAgent,
        tokenHash,
        {
          tokenId: tokenId.toString(),
          isPermanent: true,
        }
      );
    }
    
    // Generate QR code using environment-aware base URL
    const qrCode = await QRCode.toDataURL(emergencyUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
    });
    
    return NextResponse.json({
      success: true,
      token,
      tokenId: tokenId.toString(),
      qrCode,
      url: emergencyUrl,
      isPermanent: true,
      regenerated: Boolean(regenerate || oldToken),
      createdAt: new Date().toISOString(),
      warning: 'This QR code is long-lived and reusable. You can print it for wallet cards or bracelets. Regenerate to revoke the old QR.',
    });
    
  } catch (error) {
    console.error('Error generating emergency token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list active tokens and resume active permanent token
export async function GET(req: NextRequest) {
  // ── DRY RUN ──────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    const baseUrl = resolveBaseUrl(req);
    const mockUrl = `${baseUrl}/emergency/dry-run-token-abc123`;
    const mockQr = await QRCode.toDataURL(mockUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
    }).catch(() => MOCK_EMERGENCY_TOKEN.qrCode);

    return NextResponse.json({
      success: true,
      tokens: MOCK_ACTIVE_TOKENS,
      activeToken: {
        token: 'dry-run-token-abc123',
        tokenId: 'dry-run-token-id-001',
        qrCode: mockQr,
        url: mockUrl,
        isPermanent: true,
      },
    });
  }
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const db = await getDbClient();
    const usersCollection = db.collection<UserDocument>('users');
    const user = await usersCollection.findOne({ email: authUser.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId') || user._id.toString();
    
    let profileObjectId: ObjectId;
    try {
      profileObjectId = new ObjectId(profileId);
    } catch (error) {
      profileObjectId = user._id;
    }
    
    // Verify the profileId matches the user's ID
    if (!user._id.equals(profileObjectId)) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 403 }
      );
    }
    const activeTokens = await getActiveTokensForProfile(profileObjectId);
    const baseUrl = resolveBaseUrl(req);

    // Retrieve active permanent token details for instant settings resumption
    let activeTokenData: {
      token: string;
      tokenId: string;
      qrCode: string;
      url: string;
      isPermanent: boolean;
    } | null = null;

    if (activeTokens && activeTokens.length > 0) {
      const active = activeTokens[0];
      const rawToken = active.metadata?.token || active.token;
      if (rawToken) {
        const url = active.metadata?.url || `${baseUrl}/emergency/${rawToken}`;
        let qrCode = active.metadata?.qrCode;
        if (!qrCode) {
          qrCode = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 400,
          }).catch(() => '');
        }
        activeTokenData = {
          token: rawToken,
          tokenId: active._id?.toString() || active.id || active.tokenId,
          qrCode,
          url,
          isPermanent: active.isPermanent !== false,
        };
      }
    }
    
    // Return sanitized tokens (no hash)
    const sanitizedTokens = activeTokens.map(t => ({
      id: t._id?.toString() || t.id,
      createdAt: t.createdAt,
      lastAccessedAt: t.lastAccessedAt,
      accessCount: t.accessCount || 0,
      isPermanent: t.isPermanent !== false,
      revoked: Boolean(t.revoked),
    }));
    
    return NextResponse.json({
      success: true,
      tokens: sanitizedTokens,
      activeToken: activeTokenData,
    });
    
  } catch (error) {
    console.error('Error fetching active tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
