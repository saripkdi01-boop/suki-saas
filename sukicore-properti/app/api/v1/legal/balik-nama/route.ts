import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/legal/balik-nama';
const TABLE = 'balik_nama';

const optEmpty = (max?: number) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    max ? z.string().trim().max(max).nullable() : z.string().trim().nullable()
  );

const dateOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.').nullable()
);

const numOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().min(0, 'Minimal 0.').nullable()
);

const idOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().int().positive().nullable()
);

export const balikNamaSchema = z.object({
  customer_id: z.coerce.number().int().positive('Customer wajib dipilih.'),
  unit_id: idOpt,
  notaris_id: idOpt,
  status: z.enum(['belum', 'proses', 'selesai']).default('belum'),
  tanggal: dateOpt,
  nominal: numOpt,
  keterangan: optEmpty(2000),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select('*, customers!inner(nama_lengkap), units(kode_kavling), notaries(nama)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customers.nama_lengkap', `%${q}%`);
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
  const parsed = await parseBody(req, balikNamaSchema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah balik nama customer #${parsed.data.customer_id}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
