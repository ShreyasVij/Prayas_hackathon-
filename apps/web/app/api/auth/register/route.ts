import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollection } from "@/lib/server/db";
import { saveProfileJsonToSupabase, ProfileJsonData } from "@/lib/server/supabaseProfile";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || "New Patient").trim();

    // Check if user already exists
    let existingUser = null;
    try {
      const users = await getCollection<any>("users");
      existingUser = await users.findOne({ email: cleanEmail });
    } catch {
      // offline/dry-run fallback
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Account already exists with this email. Please log in instead." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Initial Profile JSON for Supabase
    const initialJson: ProfileJsonData = {
      email: cleanEmail,
      name: cleanName,
      basicDetails: {
        name: cleanName,
        gender: null,
        dob: null,
        age: null,
        phone: null,
        bloodGroup: null,
        emergencyContact: { name: null, phone: null, relationship: null },
        location: { city: null, state: null, country: "India" },
        profileImageUrl: null,
        profileImageName: null,
      },
      healthAndLifestyle: {
        diet: { breakfast: [], lunch: [], dinner: [] },
        dailyRoutine: null,
        allergies: null,
        medications: null,
      },
      customization: {
        theme: "light",
      },
      onboarding: {
        completed: false,
        completedAt: null,
      },
      updatedAt: new Date().toISOString(),
    };

    // Save initial profile to Supabase & local cache
    await saveProfileJsonToSupabase(cleanEmail, initialJson);

    // Insert into DB
    try {
      const users = await getCollection<any>("users");
      await users.insertOne({
        email: cleanEmail,
        name: cleanName,
        passwordHash,
        roles: ["patient"],
        status: "active",
        onboardingCompleted: false,
        profile: {
          phone: null,
          gender: null,
          location: { country: "India" },
          diet: { breakfast: [], lunch: [], dinner: [] },
          customization: { theme: "light" },
          onboardingCompleted: false,
        },
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });
    } catch (dbErr) {
      console.warn("[Register] DB insert skipped/failed:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. Proceed to onboarding.",
      user: {
        email: cleanEmail,
        name: cleanName,
        isNewUser: true,
        onboardingCompleted: false,
      },
    });
  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
