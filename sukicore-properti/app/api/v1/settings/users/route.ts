import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { hashPassword } from '@/lib/auth';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/pengaturan-pengguna';
const TABLE = 'users';

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter.')
    .max(40, 'Maksimal 40 karakter.')
    .regex(/^[a-z0-9._-]+$/, 'Username hanya boleh huruf kecil, angka, titik, underscore, strip.')
    .transform((s) => s.toLowerCase()),
  nama_lengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(120, 'Maksimal 120 karakter.'),
  role_id: z.coerce.number().int('Role wajib dipilih.'),
  password: z.string().min(8, 'Password minimal 8 karakter.').max(100, 'Maksimal 100 karakter.'),
  is_active: z.boolean().default(true),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select('id, username, nama_lengkap, role_id, is_active, last_login_at, roles(nama)', { count: 'exact' })
    .order('username');
  if (q) query = query.or(`username.ilike.%${q}%,nama_lengkap.ilike.%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, createSchema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: dup } = await db.from(TABLE).select('id').eq('username', parsed.data.username).maybeSingle();
  if (dup) return err('DUPLICATE', 'Username sudah dipakai.', 409);
  const { data: role } = await db.from('roles').select('id').eq('id', parsed.data.role_id).maybeSingle();
  if (!role) return err('VALIDATION', 'Role tidak ditemukan.', 422);

  const { data, error } = await db
    .from(TABLE)
    .insert({
      username: parsed.data.username,
      nama_lengkap: parsed.data.nama_lengkap,
      role_id: parsed.data.role_id,
      password_hash: await hashPassword(parsed.data.password),
      is_active: parsed.data.is_active,
      must_change_password: true,
    })
    .select('id, username, nama_lengkap')
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah pengguna: ${parsed.data.username}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
