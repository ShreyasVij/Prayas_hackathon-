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

/**
 * Returns an administrative service-role client when configured,
 * or falls back to the public anon client.
 */
export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

/**
 * Creates an emergency token entry in the Supabase emergency_tokens table.
 */
export async function createSupabaseEmergencyToken(params: {
  profileId: string;
  userId?: string;
  tokenHash: string;
  label?: string;
  isPermanent?: boolean;
  metadata?: any;
}): Promise<any> {
  const client = getSupabaseAdminClient();
  const payload = {
    profile_id: params.profileId,
    user_id: params.userId || (params.profileId && params.profileId.length === 36 ? params.profileId : null),
    token_hash: params.tokenHash,
    label: params.label || 'Emergency QR Token',
    is_permanent: params.isPermanent !== false,
    revoked: false,
    metadata: params.metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('emergency_tokens')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error inserting Supabase emergency token:', error.message || error);
    return null;
  }
  return data;
}

/**
 * Retrieves an active emergency token by its SHA-256 hash.
 */
export async function getSupabaseEmergencyTokenByHash(tokenHash: string): Promise<any> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from('emergency_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !data) {
    return null;
  }
  return {
    id: data.id,
    _id: data.id,
    profileId: data.profile_id,
    userId: data.user_id,
    tokenHash: data.token_hash,
    label: data.label,
    isPermanent: data.is_permanent,
    revoked: data.revoked,
    accessCount: data.access_count,
    lastAccessedAt: data.last_accessed_at,
    metadata: data.metadata,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Marks an emergency token as revoked in Supabase by its id or tokenHash.
 */
export async function revokeSupabaseEmergencyToken(tokenIdOrHash: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenIdOrHash);
  let query = client.from('emergency_tokens').update({
    revoked: true,
    updated_at: new Date().toISOString(),
  });
  if (isUuid) {
    query = query.eq('id', tokenIdOrHash);
  } else {
    query = query.eq('token_hash', tokenIdOrHash);
  }
  const { error } = await query;
  if (error) {
    console.error('Error revoking Supabase emergency token:', error.message || error);
    return false;
  }
  return true;
}

/**
 * Inserts an emergency access log entry in Supabase.
 */
export async function logSupabaseEmergencyAccess(params: {
  tokenId?: string;
  tokenHash: string;
  ip?: string;
  userAgent?: string;
  coordinates?: any;
  location?: string;
  metadata?: any;
}): Promise<boolean> {
  const client = getSupabaseAdminClient();
  const isUuid = params.tokenId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.tokenId);
  const payload = {
    token_id: isUuid ? params.tokenId : null,
    token_hash: params.tokenHash,
    ip: params.ip || null,
    user_agent: params.userAgent || null,
    location: params.location || null,
    coordinates: params.coordinates || null,
    metadata: params.metadata || {},
    scanned_at: new Date().toISOString(),
  };

  const { error } = await client
    .from('emergency_access_logs')
    .insert(payload);

  if (error) {
    console.error('Error logging Supabase emergency access:', error.message || error);
    return false;
  }
  return true;
}

