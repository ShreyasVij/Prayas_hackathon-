import { createClient } from '@supabase/supabase-js';

// Ensure you have these env variables in your .env or .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseProfile {
  id: string; // uuid from auth.users
  email?: string;
  role?: 'patient' | 'doctor';
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch the user's profile from the profiles table.
 */
export async function getSupabaseProfile(userId: string): Promise<SupabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching Supabase profile:', error);
    return null;
  }
  return data as SupabaseProfile;
}

/**
 * Updates the single JSON `data` column with new profile/questionnaire answers.
 */
export async function updateSupabaseProfileData(userId: string, profileData: Record<string, any>): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      data: profileData, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating Supabase profile data:', error);
    return false;
  }
  return true;
}

/**
 * Updates the user's role (patient/doctor).
 */
export async function updateSupabaseProfileRole(userId: string, role: 'patient' | 'doctor'): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      role, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating Supabase profile role:', error);
    return false;
  }
  return true;
}
