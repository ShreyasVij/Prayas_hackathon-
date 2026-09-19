import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { markTokenPrinted } from '@/../../packages/db';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }
    
    // Hash the token
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const marked = await markTokenPrinted(tokenHash);
    
    if (!marked) {
      return NextResponse.json(
        { error: 'Failed to mark token as printed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Token marked as printed',
    });
    
  } catch (error) {
    console.error('Error marking token as printed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
