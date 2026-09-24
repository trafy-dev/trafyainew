import { supabase } from '../lib/supabase';

export { supabase };

export const BUCKET = 'lms-files';

/** Signed URL for a private file; null if the caller may not read it. */
export async function fileUrl(path) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function uploadFile(path, file) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export const safeName = (name) => name.replace(/[^\w.\-]+/g, '_');
