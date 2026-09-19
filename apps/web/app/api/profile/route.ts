import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/server/authOptions";
import { getCollection } from "@/lib/server/db";
import {
  saveProfileJsonToSupabase,
  getProfileJsonFromSupabase,
  ProfileJsonData,
  UserDietData,
} from "@/lib/server/supabaseProfile";
import type { UserProfile } from "@db/users";

const DRY_RUN = process.env.NEXT_PUBLIC_DRY_RUN === "true";

function toNullIfEmpty<T extends string | undefined | null>(v: T): T | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? (s as any) : null;
}

function normalizeGender(g: string | undefined | null): UserProfile["gender"] | null {
  if (!g) return null;
  const s = g.toLowerCase();
  if (s === "prefer not to say" || s === "prefer_not_to_say") return "prefer_not_to_say";
  if (s === "male") return "male";
  if (s === "female") return "female";
  if (s === "other") return "other";
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email || (DRY_RUN ? "alex.johnson@example.com" : null);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check Supabase JSON first
    const supabaseProfile = await getProfileJsonFromSupabase(email);

    // 2. Fetch from database
    let dbUser: any = null;
    try {
      const users = await getCollection<any>("users");
      dbUser = await users.findOne({ email });
    } catch {
      // DB optional in offline/dry-run
    }

    // Merge profile data (Supabase + DB)
    const baseProfile = dbUser?.profile || {};
    const effectiveProfile: UserProfile = {
      phone: supabaseProfile?.basicDetails?.phone ?? baseProfile?.phone ?? null,
      dob: supabaseProfile?.basicDetails?.dob ?? baseProfile?.dob ?? null,
      age: supabaseProfile?.basicDetails?.age ?? baseProfile?.age ?? null,
      gender: (supabaseProfile?.basicDetails?.gender as any) ?? baseProfile?.gender ?? null,
      profileImageUrl: supabaseProfile?.basicDetails?.profileImageUrl ?? baseProfile?.profileImageUrl ?? null,
      profileImageName: supabaseProfile?.basicDetails?.profileImageName ?? baseProfile?.profileImageName ?? null,
      medical: {
        bloodGroup: supabaseProfile?.basicDetails?.bloodGroup ?? baseProfile?.medical?.bloodGroup ?? null,
        allergies: supabaseProfile?.healthAndLifestyle?.allergies ?? baseProfile?.medical?.allergies ?? null,
        conditions: baseProfile?.medical?.conditions ?? null,
        medications: supabaseProfile?.healthAndLifestyle?.medications ?? baseProfile?.medical?.medications ?? null,
      },
      emergency: {
        name: supabaseProfile?.basicDetails?.emergencyContact?.name ?? baseProfile?.emergency?.name ?? null,
        phone: supabaseProfile?.basicDetails?.emergencyContact?.phone ?? baseProfile?.emergency?.phone ?? null,
        relationship: supabaseProfile?.basicDetails?.emergencyContact?.relationship ?? baseProfile?.emergency?.relationship ?? null,
      },
      location: {
        city: supabaseProfile?.basicDetails?.location?.city ?? baseProfile?.location?.city ?? null,
        state: supabaseProfile?.basicDetails?.location?.state ?? baseProfile?.location?.state ?? null,
        country: supabaseProfile?.basicDetails?.location?.country ?? baseProfile?.location?.country ?? "India",
      },
      diet: supabaseProfile?.healthAndLifestyle?.diet ?? baseProfile?.diet ?? { breakfast: [], lunch: [], dinner: [] },
      dailyRoutine: supabaseProfile?.healthAndLifestyle?.dailyRoutine ?? baseProfile?.dailyRoutine ?? null,
      customization: {
        theme: supabaseProfile?.customization?.theme ?? baseProfile?.customization?.theme ?? "light",
      },
      onboardingCompleted: supabaseProfile?.onboarding?.completed ?? baseProfile?.onboardingCompleted ?? dbUser?.onboardingCompleted ?? false,
    };

    return NextResponse.json({
      profile: effectiveProfile,
      supabaseJson: supabaseProfile,
      user: dbUser ? {
        _id: dbUser._id,
        email: dbUser.email,
        name: dbUser.name || supabaseProfile?.name,
        roles: dbUser.roles || ["patient"],
        status: dbUser.status || "active",
        createdAt: dbUser.createdAt,
        googleSub: dbUser.googleSub,
      } : {
        email,
        name: supabaseProfile?.name || session?.user?.name || "Patient",
        roles: ["patient"],
        status: "active",
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: effectiveProfile.onboardingCompleted ?? false,
    });
  } catch (err) {
    console.error("PROFILE_GET_ERROR", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email || (DRY_RUN ? "alex.johnson@example.com" : null);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      dob,
      age,
      gender,
      bloodGroup,
      allergies,
      conditions,
      medications,
      emergencyName,
      emergencyPhone,
      relationship,
      city,
      state,
      country,
      diet,
      dailyRoutine,
      customization,
      onboardingCompleted,
      avatarUrl,
      avatarFileName,
    } = body ?? {};

    // Build structured clean diet data
    const cleanDiet: UserDietData = {
      breakfast: Array.isArray(diet?.breakfast) ? diet.breakfast : (diet?.breakfast ? [diet.breakfast] : []),
      lunch: Array.isArray(diet?.lunch) ? diet.lunch : (diet?.lunch ? [diet.lunch] : []),
      dinner: Array.isArray(diet?.dinner) ? diet.dinner : (diet?.dinner ? [diet.dinner] : []),
    };

    const effectiveGender = normalizeGender(gender);
    const effectiveTheme = customization?.theme === "dark" ? "dark" : "light";
    const isCompleted = onboardingCompleted === true || onboardingCompleted === "true";

    // 1. Build JSON structure for Supabase
    const profileJson: ProfileJsonData = {
      email,
      name: name || session?.user?.name || "Patient",
      basicDetails: {
        name: name || session?.user?.name || "Patient",
        gender: effectiveGender,
        dob: dob ? String(dob).slice(0, 10) : null,
        age: age ? Number(age) : null,
        phone: toNullIfEmpty(phone),
        bloodGroup: toNullIfEmpty(bloodGroup),
        emergencyContact: {
          name: toNullIfEmpty(emergencyName),
          phone: toNullIfEmpty(emergencyPhone),
          relationship: toNullIfEmpty(relationship),
        },
        location: {
          city: toNullIfEmpty(city),
          state: toNullIfEmpty(state),
          country: toNullIfEmpty(country) || "India",
        },
        profileImageUrl: toNullIfEmpty(avatarUrl),
        profileImageName: toNullIfEmpty(avatarFileName),
      },
      healthAndLifestyle: {
        diet: cleanDiet,
        dailyRoutine: toNullIfEmpty(dailyRoutine),
        allergies: toNullIfEmpty(allergies),
        medications: toNullIfEmpty(medications),
      },
      customization: {
        theme: effectiveTheme,
      },
      onboarding: {
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      },
      updatedAt: new Date().toISOString(),
    };

    // 2. Save JSON to Supabase and local cache
    const supabaseResult = await saveProfileJsonToSupabase(email, profileJson);

    // 3. Save to MongoDB
    const profile: UserProfile = {
      phone: toNullIfEmpty(phone) as any,
      dob: dob ? new Date(dob) : null,
      age: age ? Number(age) : null,
      gender: effectiveGender || undefined,
      profileImageUrl: toNullIfEmpty(avatarUrl) as any,
      profileImageName: toNullIfEmpty(avatarFileName) as any,
      medical: {
        bloodGroup: toNullIfEmpty(bloodGroup) as any,
        allergies: toNullIfEmpty(allergies) as any,
        conditions: toNullIfEmpty(conditions) as any,
        medications: toNullIfEmpty(medications) as any,
      },
      emergency: {
        name: toNullIfEmpty(emergencyName) as any,
        phone: toNullIfEmpty(emergencyPhone) as any,
        relationship: toNullIfEmpty(relationship) as any,
      },
      location: {
        city: toNullIfEmpty(city) as any,
        state: toNullIfEmpty(state) as any,
        country: toNullIfEmpty(country) || "India",
      },
      diet: cleanDiet,
      dailyRoutine: toNullIfEmpty(dailyRoutine),
      customization: { theme: effectiveTheme },
      onboardingCompleted: isCompleted,
    };

    try {
      const users = await getCollection<any>("users");
      await users.updateOne(
        { email },
        {
          $set: {
            ...(name ? { name } : {}),
            profile,
            onboardingCompleted: isCompleted,
            customization: { theme: effectiveTheme },
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (dbErr) {
      console.warn("[Profile POST] DB update failed, continuing with Supabase:", dbErr);
    }

    return NextResponse.json({
      success: true,
      supabaseSaved: supabaseResult.supabaseSynced,
      localSaved: supabaseResult.localSynced,
      profile,
      supabaseJson: profileJson,
    });
  } catch (err) {
    console.error("PROFILE_POST_ERROR", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
