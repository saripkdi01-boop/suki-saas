import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/pengaturan-media';
const ALLOWED_KEYS = ['logo', 'favicon', 'background'] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return err('BAD_FORM', 'Form data tidak valid.', 400);
  }

  const key = String(fd.get('key') ?? '');
  if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
    return err('VALIDATION', 'Key media tidak valid.', 422);
  }
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return err('VALIDATION', 'File gambar wajib diunggah.', 422);
  }
  if (file.size > MAX_SIZE) {
    return err('VALIDATION', 'Ukuran file maksimal 5 MB.', 422);
  }
  if (!file.type.startsWith('image/')) {
    return err('VALIDATION', 'File harus berupa gambar.', 422);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${key}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabaseAdmin()
    .storage.from('app-media')
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return err('UPLOAD_ERROR', upErr.message, 500);

  const { data: pub } = supabaseAdmin().storage.from('app-media').getPublicUrl(path);
  const fileUrl = pub.publicUrl;

  const { error: dbErr } = await supabaseAdmin()
    .from('media_assets')
    .upsert({ key, file_url: fileUrl }, { onConflict: 'key' });
  if (dbErr) return err('DB_ERROR', dbErr.message, 500);

  await logActivity(auth.user.id, `unggah media: ${key}`, 'media_assets');
  return ok({ key, file_url: fileUrl }, undefined, 201);
}
