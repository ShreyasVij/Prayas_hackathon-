import { NextResponse } from "next/server";
import { getProfileJsonFromSupabase } from "@/lib/server/supabaseProfile";
import { getCollection } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check Supabase JSON first
    const supabaseProfile = await getProfileJsonFromSupabase(cleanEmail);
    if (supabaseProfile) {
      return NextResponse.json({
        exists: true,
        onboardingCompleted: supabaseProfile.onboarding?.completed ?? false,
        name: supabaseProfile.name || supabaseProfile.basicDetails?.name,
        source: "supabase",
        details: {
          name: supabaseProfile.name || supabaseProfile.basicDetails?.name,
          gender: supabaseProfile.basicDetails?.gender,
          bloodGroup: supabaseProfile.basicDetails?.bloodGroup,
          theme: supabaseProfile.customization?.theme || "light",
        },
      });
    }

    // 2. Check Database
    try {
      const users = await getCollection<any>("users");
      const user = await users.findOne({ email: cleanEmail });
      if (user) {
        return NextResponse.json({
          exists: true,
          onboardingCompleted: user.onboardingCompleted ?? user.profile?.onboardingCompleted ?? false,
          name: user.name,
          source: "database",
          details: {
            name: user.name,
            theme: user.customization?.theme || user.profile?.customization?.theme || "light",
          },
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      exists: false,
      onboardingCompleted: false,
    });
  } catch (err) {
    console.error("CHECK_ACCOUNT_ERROR", err);
    return NextResponse.json({ error: "Failed to check account" }, { status: 500 });
  }
}
