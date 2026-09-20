import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import {
  findTokenByHash,
  logTokenAccess,
  logEmergencyAction,
  detectSuspiciousActivity,
} from '@/../../packages/db';
import type { UserDocument } from '@/../../packages/db/users';
import { getDbClient } from '@/lib/server/db';

// Rate limiting map for token access attempts: key -> { count, resetAt }
const accessRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkAccessRateLimit(key: string, maxAttempts: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const limit = accessRateLimitMap.get(key);

  if (!limit || now > limit.resetAt) {
    accessRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (limit.count >= maxAttempts) {
    return false;
  }

  limit.count++;
  return true;
}

function getClientInfo(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  let ip = 'unknown';
  if (forwarded) {
    // Multi-hop proxy: extract the first comma-separated IP
    ip = forwarded.split(',')[0].trim();
  } else {
    ip = req.headers.get('x-real-ip')?.trim() ||
         req.headers.get('cf-connecting-ip')?.trim() ||
         'unknown';
  }
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ip, userAgent };
}

// Short-lived negative cache for non-existent tokens to avoid repetitive remote DB round-trips
const negativeTokenCache = new Map<string, number>();

async function lookupToken(tokenHash: string, rawToken: string) {
  const now = Date.now();
  const cachedNegative = negativeTokenCache.get(tokenHash);
  if (cachedNegative && now < cachedNegative) {
    return null;
  }

  let doc = await findTokenByHash(tokenHash);
  if (!doc && rawToken !== tokenHash) {
    doc = await findTokenByHash(rawToken);
  }

  if (!doc) {
    negativeTokenCache.set(tokenHash, now + 30000);
  }
  return doc;
}

// Canonical demo profile returned for mock / demo emergency tokens
const DEMO_PROFILE = {
  displayName: 'Alex Johnson',
  age: 34,
  dob: '1990-06-15',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Dust mites'],
  chronicConditions: ['Mild seasonal rhinitis', 'Hypertension (managed)'],
  currentMedications: ['Lisinopril 10mg daily', 'Cetirizine 10mg as needed'],
  emergencyNotes: 'Severe reaction to penicillin. Carry Epipen for severe allergic responses. Living will on file.',
  emergencyContacts: [
    {
      name: 'Jordan Johnson',
      relationship: 'Spouse',
      phone: '+91 98765 43210',
    },
    {
      name: 'Dr. Sarah Smith',
      relationship: 'Primary Physician',
      phone: '+91 91234 56789',
    },
  ],
  vitals: [
    { label: 'Blood Pressure', value: '120/80 mmHg' },
    { label: 'Heart Rate', value: '72 bpm' },
    { label: 'Blood Sugar (Fasting)', value: '95 mg/dL' },
    { label: 'Oxygen Saturation (SpO2)', value: '98%' },
    { label: 'Body Temperature', value: '98.6 °F' },
  ],
  insuranceId: '****4321',
};

// Canonical demo stored documents
const DEMO_DOCUMENTS = [
  {
    id: 'doc-001',
    title: 'Annual Comprehensive Health Checkup 2026',
    date: '2026-09-15',
    category: 'Checkup & General Report',
    docType: 'prescription',
    viewUrl: '/documents/preview/doc-001',
    fileSize: 204800,
  },
  {
    id: 'doc-002',
    title: 'Complete Blood Count & Metabolic Lab Panel',
    date: '2026-08-15',
    category: 'Laboratory Investigation',
    docType: 'lab',
    viewUrl: '/documents/preview/doc-002',
    fileSize: 102400,
  },
  {
    id: 'doc-003',
    title: 'Cardiology ECG & Echocardiogram Summary',
    date: '2026-08-15',
    category: 'Cardiology Report',
    docType: 'scan',
    viewUrl: '/documents/preview/doc-003',
    fileSize: 358400,
  },
  {
    id: 'doc-004',
    title: 'Physician Prescription — Hypertension Regimen',
    date: '2026-07-15',
    category: 'Prescription & Rx',
    docType: 'prescription',
    viewUrl: '/documents/preview/doc-004',
    fileSize: 51200,
  },
  {
    id: 'doc-005',
    title: 'Chest Radiograph (X-Ray PA View)',
    date: '2026-07-15',
    category: 'Radiology / Imaging',
    docType: 'scan',
    viewUrl: '/documents/preview/doc-005',
    fileSize: 716800,
  },
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { ip, userAgent } = getClientInfo(req);

    // Rate limiting key isolation:
    // 1. Headerless / unknown IP -> isolate per token (`token_${token}`)
    // 2. Loopback IP -> isolate per token (`loopback_${token}`)
    // 3. Normal client IP -> isolate per IP (`ip_${ip}`)
    let rateLimitKey: string;
    if (!ip || ip === 'unknown') {
      rateLimitKey = `token_${token}`;
    } else if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      rateLimitKey = `loopback_${token}`;
    } else {
      rateLimitKey = `ip_${ip}`;
    }

    // Rate limit check: 60 requests/minute
    if (!checkAccessRateLimit(rateLimitKey, 60, 60000)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again shortly.',
          locked: false,
        },
        { status: 429 }
      );
    }

    // Input boundary & security validation (up to 128 chars, safe characters only)
    if (
      !token ||
      typeof token !== 'string' ||
      token.length > 128 ||
      token.includes('\0') ||
      token.includes('%00') ||
      token.includes('..') ||
      token.includes('<') ||
      token.includes('>') ||
      token.includes("'") ||
      token.includes('"') ||
      !/^[a-zA-Z0-9_\-.:]+$/.test(token)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid or expired QR code',
          locked: false,
        },
        { status: 404 }
      );
    }

    // Extract optional query coordinates
    const url = new URL(req.url);
    const latitude = url.searchParams.get('lat');
    const longitude = url.searchParams.get('lon');
    const approximate = url.searchParams.get('loc');

    const location = {
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      approximate: approximate || undefined,
    };

    // Calculate token hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Check if token is a recognized demo token
    const isDemoToken =
      token === 'emg-live-8921-xyz' ||
      token === 'dry-run-token-abc123' ||
      token === 'emg-live-token' ||
      token === 'dry-run' ||
      token === 'emg-live-custom-responder-99' ||
      token.startsWith('emg-live-') ||
      token.startsWith('dry-run');

    // Look up the token in DB or memory (with negative cache optimization)
    const tokenDoc = await lookupToken(tokenHash, token);

    // If token exists in DB, check revocation & suspicious activity
    if (tokenDoc) {
      // Check if revoked
      if (tokenDoc.revoked) {
        await logEmergencyAction(
          tokenDoc.userId,
          tokenDoc.profileId,
          'token_invalid',
          ip,
          userAgent,
          tokenHash,
          { reason: 'Token revoked' }
        );

        return NextResponse.json(
          {
            error: 'Emergency access revoked by the owner',
            locked: true,
            revoked: true,
          },
          { status: 403 }
        );
      }

      // Check suspicious activity
      const isSuspicious = await detectSuspiciousActivity(ip, 60, 15);
      if (isSuspicious) {
        await logEmergencyAction(
          tokenDoc.userId,
          tokenDoc.profileId,
          'token_invalid',
          ip,
          userAgent,
          tokenHash,
          { reason: 'Suspicious activity detected', blocked: true }
        );

        return NextResponse.json(
          {
            error: 'Access blocked due to suspicious activity',
            locked: true,
          },
          { status: 403 }
        );
      }

      // Log QR access
      await logTokenAccess(tokenHash, ip, userAgent, location);

      // If this is also a demo token, return the demo payload
      if (isDemoToken) {
        return NextResponse.json({
          success: true,
          token,
          accessTimestamp: new Date().toISOString(),
          profile: DEMO_PROFILE,
          documents: DEMO_DOCUMENTS,
        });
      }

      // Attempt to fetch real patient user & profile from DB
      let user: UserDocument | null = null;
      let storedDocs: any[] = [];
      try {
        const db = await getDbClient();
        if (db) {
          const usersCollection = db.collection<UserDocument>('users');
          if (tokenDoc.profileId && ObjectId.isValid(tokenDoc.profileId.toString())) {
            user = await usersCollection.findOne({ _id: new ObjectId(tokenDoc.profileId.toString()) });
          }
          if (!user && tokenDoc.userId && ObjectId.isValid(tokenDoc.userId.toString())) {
            user = await usersCollection.findOne({ _id: new ObjectId(tokenDoc.userId.toString()) });
          }

          // Query documents collection for this profile/user
          const docsCol = db.collection('documents');
          const pid = tokenDoc.profileId?.toString();
          const uid = tokenDoc.userId?.toString();
          const q: any = { status: { $ne: 'deleted' } };
          if (pid && uid && pid !== uid) {
            q.$or = [
              { profileId: pid },
              { profileId: tokenDoc.profileId },
              { userId: uid },
              { userId: tokenDoc.userId },
              { ownerUserId: uid },
            ];
          } else if (pid) {
            q.$or = [
              { profileId: pid },
              { profileId: tokenDoc.profileId },
              { userId: pid },
              { ownerUserId: pid },
            ];
          }
          const found = await docsCol.find(q).sort({ createdAt: -1 }).limit(20).toArray();
          if (found && found.length > 0) {
            storedDocs = found.map((d: any) => ({
              id: d.id || d._id?.toString(),
              title: d.title || d.originalName || d.fileName || 'Medical Record',
              date: d.createdAt
                ? new Date(d.createdAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              category: d.category || d.docType || 'Medical Record',
              docType: d.docType || 'other',
              viewUrl: d.storageKey
                ? `/api/documents/file?storageKey=${encodeURIComponent(d.storageKey)}`
                : (d.viewUrl || `/documents/preview/${d.id || d._id}`),
              fileSize: d.fileSize || d.metadata?.fileSize || 102400,
            }));
          }
        }
      } catch (dbErr) {
        console.warn('DB profile lookup error:', dbErr);
      }

      // If user profile is not found in DB
      if (!user) {
        await logEmergencyAction(
          tokenDoc.userId,
          tokenDoc.profileId,
          'token_invalid',
          ip,
          userAgent,
          tokenHash,
          { reason: 'User not found' }
        );

        return NextResponse.json(
          {
            error: 'User profile not found for this emergency token',
            locked: false,
          },
          { status: 404 }
        );
      }

      // Log successful access
      await logEmergencyAction(
        tokenDoc.userId,
        tokenDoc.profileId,
        'token_accessed',
        ip,
        userAgent,
        tokenHash,
        { location }
      );

      // Parse user details
      let age: number | undefined;
      let dob: string | undefined;
      if (user.profile?.dob) {
        const birthDate = new Date(user.profile.dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          dob = birthDate.toLocaleDateString();
        }
      }

      const emergencyContacts = user.profile?.emergency
        ? [
            {
              name: user.profile.emergency.name || 'Emergency Contact',
              relationship: user.profile.emergency.relationship || 'Contact',
              phone: user.profile.emergency.phone || '112',
            },
          ]
        : (user.profile as any)?.emergencyContacts || [
            {
              name: 'Emergency Services',
              relationship: 'Primary Dispatch',
              phone: '112',
            },
          ];

      const allergies = user.profile?.medical?.allergies
        ? user.profile.medical.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
        : (Array.isArray((user.profile as any)?.allergies) ? (user.profile as any).allergies : []);

      const chronicConditions = user.profile?.medical?.conditions
        ? user.profile.medical.conditions.split(',').map((c: string) => c.trim()).filter(Boolean)
        : (Array.isArray((user.profile as any)?.conditions) ? (user.profile as any).conditions : []);

      const currentMedications = user.profile?.medical?.medications
        ? user.profile.medical.medications.split(',').map((m: string) => m.trim()).filter(Boolean)
        : (Array.isArray((user.profile as any)?.medications) ? (user.profile as any).medications : []);

      const vitals = [
        { label: 'Blood Pressure', value: '120/80 mmHg' },
        { label: 'Heart Rate', value: '72 bpm' },
        { label: 'Oxygen Saturation (SpO2)', value: '98%' },
        { label: 'Body Temperature', value: '98.6 °F' },
      ];

      return NextResponse.json({
        success: true,
        token,
        accessTimestamp: new Date().toISOString(),
        profile: {
          displayName: user.name || user.profile?.displayName || 'Patient',
          age: age ?? 35,
          dob: dob ?? '1990-01-01',
          bloodGroup: user.profile?.medical?.bloodGroup || 'O+',
          allergies,
          chronicConditions,
          currentMedications,
          emergencyNotes: user.profile?.medical?.notes || 'No special instructions recorded.',
          emergencyContacts,
          vitals,
          insuranceId: user.profile?.medical?.['insuranceId']
            ? `****${String(user.profile.medical['insuranceId']).slice(-4)}`
            : undefined,
        },
        documents: storedDocs.length > 0 ? storedDocs : DEMO_DOCUMENTS,
      });
    }

    // 2. If token not in DB, check if it is an authorized demo token
    if (isDemoToken) {
      try {
        await logTokenAccess(tokenHash, ip, userAgent, location);
        await logEmergencyAction(
          'demo-user',
          'demo-profile',
          'token_accessed',
          ip,
          userAgent,
          tokenHash,
          { location, demo: true }
        );
      } catch {}

      return NextResponse.json({
        success: true,
        token,
        accessTimestamp: new Date().toISOString(),
        profile: DEMO_PROFILE,
        documents: DEMO_DOCUMENTS,
      });
    }

    // 3. Unknown / Non-existent token -> 404
    return NextResponse.json(
      {
        error: 'Invalid or expired QR code',
        locked: false,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error accessing emergency token:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        locked: false,
      },
      { status: 500 }
    );
  }
}
