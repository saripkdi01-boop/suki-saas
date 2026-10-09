/** Upload file ke Supabase Storage (server-side). */
import { supabaseAdmin } from './supabase';

/**
 * Upload file ke bucket dan kembalikan public URL.
 * path contoh: 'customer/123/ktp-abc123.pdf'
 * @throws Error bila upload gagal.
 */
export async function uploadToBucket(bucket: string, file: File, path: string): Promise<string> {
  const db = supabaseAdmin();
  const { error } = await db.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type || 'application/octet-stream',
    upsert: true,
  });
  if (error) throw new Error(`Gagal upload ke bucket ${bucket}: ${error.message}`);
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Ambil storage path dari public URL Supabase.
 * Public URL berbentuk: https://<host>/storage/v1/object/public/<bucket>/<path>
 * Kembalikan null bila URL bukan URL publik bucket tersebut.
 */
export function storagePathFromUrl(bucket: string, url: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length).split('?')[0];
  return path || null;
}

/** Ganti karakter tak aman untuk nama file menjadi '_'. */
export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
