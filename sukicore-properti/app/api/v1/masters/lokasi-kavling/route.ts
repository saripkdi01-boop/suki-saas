import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/lokasi-kavling';
const TABLE = 'locations';

const schema = z.object({
  kode: z.string().trim().min(1, 'Kode wajib diisi.').max(20, 'Maksimal 20 karakter.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  alamat: z.string().trim().max(500).optional().or(z.literal('')),
  company_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().nullable()
  ),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  return {
    kode: d.kode.trim().toUpperCase(),
    nama: d.nama.trim(),
    alamat: d.alamat && d.alamat.trim() !== '' ? d.alamat.trim() : null,
    company_id: d.company_id,
  };
}

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return err('DUPLICATE', 'Kode lokasi sudah dipakai.', 409);
  return err('DB_ERROR', error.message, 500);
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*, companies(nama)', { count: 'exact' }).order('nama');
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
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(clean(parsed.data)).select().single();
  if (error) return friendly(error);
  await logActivity(auth.user.id, `tambah lokasi: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
