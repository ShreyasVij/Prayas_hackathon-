import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from 'next/server';


import { sendEmail, EmailTemplate } from '@/lib/server/email';

// POST /api/email/send
// Send an email (authenticated only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      to,
      subject,
      template,
      data,
      replyTo,
    }: {
      to: string | string[];
      subject: string;
      template: EmailTemplate;
      data?: Record<string, any>;
      replyTo?: string;
    } = body;

    // Validate required fields
    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, template' },
        { status: 400 }
      );
    }

    // Send email
    const result = await sendEmail({
      to,
      subject,
      template,
      data,
      replyTo,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
