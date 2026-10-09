import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/pengaturan-profil';

const KEYMAP = {
  nama: 'company_nama',
  alamat: 'company_alamat',
  telepon: 'company_telepon',
  email: 'company_email',
} as const;

const schema = z.object({
  nama: z.string().trim().min(1, 'Nama perusahaan wajib diisi.').max(120, 'Maksimal 120 karakter.'),
  alamat: z.string().trim().max(500, 'Maksimal 500 karakter.').default(''),
  telepon: z.string().trim().max(30, 'Maksimal 30 karakter.').default(''),
  email: z.string().trim().max(120, 'Maksimal 120 karakter.').default(''),
});

export async function GET() {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { data, error } = await supabaseAdmin()
    .from('app_settings')
    .select('key, value')
    .in('key', Object.values(KEYMAP));
  if (error) return err('DB_ERROR', error.message, 500);
  const out: Record<string, string> = { nama: '', alamat: '', telepon: '', email: '' };
  for (const [field, key] of Object.entries(KEYMAP)) {
    const row = (data ?? []).find((r) => r.key === key);
    out[field] = (row?.value as string | null) ?? '';
  }
  return ok(out);
}

export async function PUT(req: Request) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const rows = Object.entries(KEYMAP).map(([field, key]) => ({
    key,
    value: parsed.data[field as keyof typeof KEYMAP] as string,
  }));
  const { error } = await supabaseAdmin().from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, 'ubah profil perusahaan', 'app_settings');
  return ok({ message: 'Profil perusahaan tersimpan.' });
}
