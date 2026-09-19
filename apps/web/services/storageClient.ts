import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/** Upload a file to a Supabase Storage bucket. */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | Blob,
  contentType?: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Create a short-lived signed download URL. */
export async function createDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/** Create signed download URLs for multiple paths under a prefix. */
export async function createDownloadUrlsForPrefix(
  bucket: string,
  prefix: string,
  expiresInSeconds = 3600
): Promise<Record<string, string>> {
  const { data: files, error: listErr } = await supabase.storage
    .from(bucket)
    .list(prefix);
  if (listErr) throw new Error(`List failed: ${listErr.message}`);

  const result: Record<string, string> = {};
  await Promise.all(
    (files || []).map(async (f) => {
      const fullPath = `${prefix}/${f.name}`;
      result[f.name] = await createDownloadUrl(bucket, fullPath, expiresInSeconds);
    })
  );
  return result;
}

/** List files under a prefix in a bucket. */
export async function listFiles(
  bucket: string,
  prefix: string
): Promise<{ name: string; size: number }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix);
  if (error) throw new Error(`List failed: ${error.message}`);
  return (data || []).map((f) => ({ name: f.name, size: f.metadata?.size ?? 0 }));
}

/** Delete all storage objects under given paths. */
export async function deleteStorageObjects(
  bucket: string,
  paths: string[]
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** Ensure a user-specific storage folder exists (no-op on Supabase). */
export async function ensureUserSpace(userId: string): Promise<void> {
  // Supabase Storage creates folders implicitly on first upload; nothing to do.
  void userId;
}
