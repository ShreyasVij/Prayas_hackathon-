import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


import { getCollection } from "@/lib/server/db";
import type { UserDocument } from "@db/users";
import { google } from "googleapis";

/**
 * GET /api/google/connect
 * Initiates Google OAuth flow for Calendar access
 * Redirects doctor to Google consent screen
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a doctor
    const users = await getCollection<UserDocument>("users");
    const user = await users.findOne({ email: authUser.email });
    
    if (!user?.roles?.includes("doctor")) {
      return NextResponse.json({ error: "Not a doctor" }, { status: 403 });
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/google/callback`
    );

    // Generate OAuth URL with Calendar scope
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Get refresh token
      scope: ["https://www.googleapis.com/auth/calendar"],
      prompt: "consent", // Force consent screen to get refresh token
      state: authUser.email, // Pass email to identify doctor in callback
    });

    // Redirect to Google consent screen
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("GOOGLE_CONNECT_ERROR", err);
    return NextResponse.json(
      { error: "Failed to initiate Google connection" },
      { status: 500 }
    );
  }
}
