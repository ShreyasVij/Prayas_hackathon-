import { createClient } from "@supabase/supabase-js";

const defaultBucket = process.env.SUPABASE_BUCKET || "medilocker";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadFile(
  arg1: string | { bucket?: string; storageKey?: string; path?: string; file: File | Blob | Buffer; contentType?: string },
  pathArg?: string,
  fileArg?: File | Blob | Buffer,
  contentTypeArg?: string
): Promise<any> {
  const supabase = getSupabase();
  let bucket = defaultBucket;
  let path = "";
  let file: any = null;
  let contentType = contentTypeArg;

  if (typeof arg1 === "object" && arg1 !== null && "file" in arg1) {
    bucket = arg1.bucket || defaultBucket;
    path = arg1.storageKey || arg1.path || "";
    file = arg1.file;
    contentType = arg1.contentType;
  } else if (typeof arg1 === "string") {
    if (pathArg && fileArg) {
      bucket = arg1;
      path = pathArg;
      file = fileArg;
    } else if (pathArg) {
      path = pathArg;
      file = arg1;
    }
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ...data, publicUrl: pub.publicUrl };
}

export async function createDownloadUrl(
  arg1: string | { bucket?: string; storageKey?: string; path?: string; expiresIn?: number },
  pathArg?: string | number,
  expiresArg = 3600
): Promise<string> {
  const supabase = getSupabase();
  let bucket = defaultBucket;
  let path = "";
  let expiresIn = expiresArg;

  if (typeof arg1 === "object" && arg1 !== null) {
    bucket = arg1.bucket || defaultBucket;
    path = arg1.storageKey || arg1.path || "";
    expiresIn = arg1.expiresIn ?? expiresArg;
  } else if (typeof arg1 === "string") {
    if (typeof pathArg === "string") {
      bucket = arg1;
      path = pathArg;
      expiresIn = typeof expiresArg === "number" ? expiresArg : 3600;
    } else {
      path = arg1;
      if (typeof pathArg === "number") expiresIn = pathArg;
    }
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function createDownloadUrlsForPrefix(
  arg1: string | { bucket?: string; prefix: string; expiresIn?: number },
  prefixArg?: string,
  expiresArg = 3600
): Promise<Record<string, string>> {
  const supabase = getSupabase();
  let bucket = defaultBucket;
  let prefix = "";
  let expiresIn = expiresArg;

  if (typeof arg1 === "string") {
    bucket = arg1;
    prefix = prefixArg || "";
  } else if (arg1 && typeof arg1 === "object") {
    bucket = arg1.bucket || defaultBucket;
    prefix = arg1.prefix;
    expiresIn = arg1.expiresIn ?? expiresArg;
  }

  const { data: files, error: listErr } = await supabase.storage
    .from(bucket)
    .list(prefix);
  if (listErr) throw new Error(`List failed: ${listErr.message}`);

  const result: Record<string, string> = {};
  await Promise.all(
    (files || []).map(async (f) => {
      const fullPath = `${prefix}/${f.name}`;
      result[f.name] = await createDownloadUrl({ bucket, storageKey: fullPath, expiresIn });
    })
  );
  return result;
}

export async function listFiles(
  arg1: string | { bucket?: string; prefix: string },
  prefixArg?: string
): Promise<{ name: string; size: number }[]> {
  const supabase = getSupabase();
  let bucket = defaultBucket;
  let prefix = "";

  if (typeof arg1 === "string") {
    bucket = arg1;
    prefix = prefixArg || "";
  } else if (arg1 && typeof arg1 === "object") {
    bucket = arg1.bucket || defaultBucket;
    prefix = arg1.prefix;
  }

  const { data, error } = await supabase.storage.from(bucket).list(prefix);
  if (error) throw new Error(`List failed: ${error.message}`);
  return (data || []).map((f) => ({ name: f.name, size: f.metadata?.size ?? 0 }));
}

export async function deleteStorageObjects(
  arg1: string | { bucket?: string; keys?: string[]; paths?: string[] },
  pathsArg?: string[]
): Promise<void> {
  const supabase = getSupabase();
  let bucket = defaultBucket;
  let paths: string[] = [];

  if (typeof arg1 === "string") {
    bucket = arg1;
    paths = pathsArg || [];
  } else if (arg1 && typeof arg1 === "object") {
    bucket = arg1.bucket || defaultBucket;
    paths = arg1.keys || arg1.paths || [];
  }

  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function ensureUserSpace(
  arg1?: string | { bucket?: string; actorId?: string; userId?: string }
): Promise<void> {
  // Folder spaces are created automatically in Supabase
}
