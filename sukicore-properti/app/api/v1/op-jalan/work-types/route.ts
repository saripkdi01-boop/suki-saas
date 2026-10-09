import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/op-jalan/jenis-pekerjaan-jalan';
const TABLE = 'road_work_types';

const numOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().min(0, 'Minimal 0.').nullable()
);

export const workTypeSchema = z.object({
  project_id: z.coerce.number().int().positive('Proyek wajib dipilih.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(200, 'Maksimal 200 karakter.'),
  bobot_persen: numOpt,
  progress: z.coerce.number().int().min(0, 'Minimal 0.').max(100, 'Maksimal 100.').default(0),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  const pid = new URL(req.url).searchParams.get('project_id');
  let query = supabaseAdmin().from(TABLE).select('*', { count: 'exact' }).order('nama');
  if (pid) query = query.eq('project_id', Number(pid));
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
  const parsed = await parseBody(req, workTypeSchema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah jenis pekerjaan jalan: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
