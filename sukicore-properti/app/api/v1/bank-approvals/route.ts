import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/acc-bank';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

const schema = z.object({
  customer_id: reqId,
  plafon_acc: optNum,
  tgl_sp3k: optDate,
  tgl_expired: optDate,
  keterangan: optText,
});

const SELECT =
  'id, customer_id, plafon_acc, tgl_sp3k, tgl_expired, keterangan, customers!inner(id, nama_lengkap, units(kode_kavling))';

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('bank_approvals')
    .select(SELECT, { count: 'exact' })
    .order('tgl_sp3k', { ascending: false, nullsFirst: false });
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
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap')
    .eq('id', parsed.data.customer_id)
    .maybeSingle();
  if (!customer) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);

  const { data, error } = await db
    .from('bank_approvals')
    .insert({
      customer_id: parsed.data.customer_id,
      plafon_acc: parsed.data.plafon_acc ?? null,
      tgl_sp3k: parsed.data.tgl_sp3k ?? null,
      tgl_expired: parsed.data.tgl_expired ?? null,
      keterangan: parsed.data.keterangan ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(
    auth.user.id,
    `tambah persetujuan bank customer ${customer.nama_lengkap as string}`,
    'bank_approvals',
    data.id
  );
  return ok(data, undefined, 201);
}
