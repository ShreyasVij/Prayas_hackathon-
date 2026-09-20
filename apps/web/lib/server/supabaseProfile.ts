import { supabaseAdmin } from "@/lib/server/supabase";
import fs from "fs";
import path from "path";

export interface UserDietData {
  breakfast?: string[];
  lunch?: string[];
  dinner?: string[];
}

export interface ProfileJsonData {
  userId?: string;
  email: string;
  name: string;
  basicDetails: {
    name: string;
    gender?: string | null;
    dob?: string | null;
    age?: number | string | null;
    phone?: string | null;
    bloodGroup?: string | null;
    emergencyContact?: {
      name?: string | null;
      phone?: string | null;
      relationship?: string | null;
    };
    location?: {
      city?: string | null;
      state?: string | null;
      country?: string | null;
    };
    profileImageUrl?: string | null;
    profileImageName?: string | null;
  };
  healthAndLifestyle: {
    diet?: UserDietData;
    dailyRoutine?: string | null;
    allergies?: string | null;
    medications?: string | null;
  };
  customization: {
    theme: "light" | "dark";
  };
  onboarding: {
    completed: boolean;
    completedAt?: string | null;
  };
  updatedAt: string;
}

const LOCAL_PROFILES_DIR = path.join(process.cwd(), "data", "profiles");

function sanitizeFilename(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, "_") + ".json";
}

function ensureLocalDir() {
  try {
    if (!fs.existsSync(LOCAL_PROFILES_DIR)) {
      fs.mkdirSync(LOCAL_PROFILES_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[SupabaseProfile] Could not create local profiles dir:", err);
  }
}

/**
 * Save profile JSON to Supabase storage bucket, Supabase database table,
 * and local storage fallback.
 */
export async function saveProfileJsonToSupabase(
  email: string,
  profileData: ProfileJsonData
): Promise<{ success: boolean; supabaseSynced: boolean; localSynced: boolean }> {
  const jsonContent = JSON.stringify(profileData, null, 2);
  let supabaseSynced = false;
  let localSynced = false;

  // 1. Always save to local storage file as reliable persistence
  try {
    ensureLocalDir();
    const filePath = path.join(LOCAL_PROFILES_DIR, sanitizeFilename(email));
    fs.writeFileSync(filePath, jsonContent, "utf8");
    localSynced = true;
  } catch (err) {
    console.warn("[SupabaseProfile] Local file save failed:", err);
  }

  // 2. Save to Supabase Storage and Supabase Table
  try {
    const bucket = process.env.SUPABASE_BUCKET || "medilocker";
    const client = supabaseAdmin();
    const storagePath = `profiles/${sanitizeFilename(email)}`;

    // Ensure bucket exists or attempt upload
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(storagePath, Buffer.from(jsonContent, "utf8"), {
        contentType: "application/json",
        upsert: true,
      });

    if (!uploadError) {
      supabaseSynced = true;
    } else {
      console.warn("[SupabaseProfile] Storage upload warning:", uploadError.message);
    }

    // Try to sync to Supabase database table 'profiles' if configured
    try {
      await client.from("profiles").update(
        {
          data: profileData,
          updated_at: new Date().toISOString(),
        }
      ).eq("email", email.toLowerCase());
    } catch {
      // Table might not exist; safe to ignore
    }
  } catch (err: any) {
    console.warn("[SupabaseProfile] Supabase sync skipped/failed:", err?.message || err);
  }

  return {
    success: localSynced || supabaseSynced,
    supabaseSynced,
    localSynced,
  };
}

/**
 * Fetch profile JSON from Supabase storage, Supabase table,
 * or local fallback.
 */
export async function getProfileJsonFromSupabase(
  email: string
): Promise<ProfileJsonData | null> {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Try Supabase Storage
  try {
    const bucket = process.env.SUPABASE_BUCKET || "medilocker";
    const client = supabaseAdmin();
    const storagePath = `profiles/${sanitizeFilename(cleanEmail)}`;

    const { data, error } = await client.storage.from(bucket).download(storagePath);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text) as ProfileJsonData;
      return parsed;
    }
  } catch (err: any) {
    // Supabase unavailable or network error
  }

  // 2. Try Supabase Table
  try {
    const client = supabaseAdmin();
    const { data } = await client
      .from("profiles")
      .select("profile_data")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (data?.profile_data) {
      return data.profile_data as ProfileJsonData;
    }
  } catch {
    // ignore
  }

  // 3. Try Local JSON File
  try {
    ensureLocalDir();
    const filePath = path.join(LOCAL_PROFILES_DIR, sanitizeFilename(cleanEmail));
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, "utf8");
      return JSON.parse(text) as ProfileJsonData;
    }
  } catch (err) {
    console.warn("[SupabaseProfile] Local file read failed:", err);
  }

  return null;
}
