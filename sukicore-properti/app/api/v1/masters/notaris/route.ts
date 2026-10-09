import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/notaris';
const TABLE = 'notaries';

const schema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  alamat: z.string().trim().max(500).optional().or(z.literal('')),
  telepon: z.string().trim().max(30).optional().or(z.literal('')),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  const s = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null);
  return { nama: d.nama.trim(), alamat: s(d.alamat), telepon: s(d.telepon) };
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*', { count: 'exact' }).order('nama');
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
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(clean(parsed.data)).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah notaris: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
