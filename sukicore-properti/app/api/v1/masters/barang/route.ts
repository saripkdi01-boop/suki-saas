import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/barang';
const TABLE = 'items';

const numNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nullable()
);

const schema = z.object({
  kode: z.string().trim().min(1, 'Kode wajib diisi.').max(30, 'Maksimal 30 karakter.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  satuan_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().nullable()
  ),
  stok: z.preprocess((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)), z.number().int().min(0)),
  harga_beli: numNull,
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  return {
    kode: d.kode.trim().toUpperCase(),
    nama: d.nama.trim(),
    satuan_id: d.satuan_id,
    stok: d.stok ?? 0,
    harga_beli: d.harga_beli,
  };
}

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return err('DUPLICATE', 'Kode barang sudah dipakai.', 409);
  return err('DB_ERROR', error.message, 500);
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*, units_of_measure(nama)', { count: 'exact' }).order('nama');
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
  await logActivity(auth.user.id, `tambah barang: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
