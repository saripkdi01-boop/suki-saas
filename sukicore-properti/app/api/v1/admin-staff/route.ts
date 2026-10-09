import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/marketing/admin-pemberkasan';
const TABLE = 'admin_staff';

export const adminStaffSchema = z.object({
  kode: z.string().trim().min(1, 'Kode wajib diisi.').max(50, 'Maksimal 50 karakter.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(200, 'Maksimal 200 karakter.'),
  is_active: z.coerce.boolean().default(true),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*', { count: 'exact' }).order('nama');
  if (q) query = query.or(`nama.ilike.%${q}%,kode.ilike.%${q}%`);
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
  const parsed = await parseBody(req, adminStaffSchema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(parsed.data).select().single();
  if (error) {
    if (error.code === '23505') return err('DUPLICATE', 'Kode sudah dipakai.', 409);
    return err('DB_ERROR', error.message, 500);
  }
  await logActivity(auth.user.id, `tambah admin pemberkasan: ${parsed.data.kode} - ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
