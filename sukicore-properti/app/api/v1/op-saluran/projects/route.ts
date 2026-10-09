import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/op-saluran/proyek-saluran';
const TABLE = 'channel_projects';

const dateOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.').nullable()
);

export const projectSchema = z.object({
  location_id: z.coerce.number().int().positive('Lokasi wajib dipilih.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(200, 'Maksimal 200 karakter.'),
  tanggal_mulai: dateOpt,
  tanggal_target: dateOpt,
  progress: z.coerce.number().int().min(0, 'Minimal 0.').max(100, 'Maksimal 100.').default(0),
  status: z.enum(['rencana', 'berjalan', 'selesai']).default('berjalan'),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select('*, locations(nama)', { count: 'exact' })
    .order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
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
  const parsed = await parseBody(req, projectSchema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah proyek saluran: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
