import { supabaseAdmin } from "@/lib/server/supabase";

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

/**
 * Save profile JSON to the authenticated Supabase profile row.
 */
export async function saveProfileJsonToSupabase(
  email: string,
  profileData: ProfileJsonData
): Promise<{ success: boolean; supabaseSynced: boolean; localSynced: boolean }> {
  try {
    const client = supabaseAdmin();
    const { data: profile, error: lookupError } = await client
      .from("profiles")
      .select("id,data")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!profile) throw new Error("Authenticated Supabase profile not found");
    const { error } = await client
      .from("profiles")
      .update({ data: profileData, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (error) throw error;
    return { success: true, supabaseSynced: true, localSynced: false };
  } catch (err: any) {
    console.error("[SupabaseProfile] Supabase save failed:", err?.message || err);
  }
  return { success: false, supabaseSynced: false, localSynced: false };
}

/**
 * Fetch profile JSON from the authenticated Supabase profile row.
 */
export async function getProfileJsonFromSupabase(
  email: string
): Promise<ProfileJsonData | null> {
  const cleanEmail = email.toLowerCase().trim();

  try {
    const client = supabaseAdmin();
    const { data } = await client
      .from("profiles")
      .select("data")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (data?.data) {
      return data.data as ProfileJsonData;
    }
  } catch (err) {
    console.error("[SupabaseProfile] Supabase profile read failed:", err);
  }

  return null;
}
