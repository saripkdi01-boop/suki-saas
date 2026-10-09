import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';

const MENU = '/admin/transaksi/acc-bank';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

const schema = z.object({
  customer_id: reqId,
  tanggal_pencairan: optDate,
  nominal: optNum,
  bank_kpr_id: optId,
  keterangan: optText,
});

const SELECT =
  'id, customer_id, tanggal_pencairan, nominal, bank_kpr_id, keterangan, customers!inner(id, nama_lengkap), bank_kpr(nama)';

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('sp3k_records')
    .select(SELECT, { count: 'exact' })
    .order('tanggal_pencairan', { ascending: false, nullsFirst: false });
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
    .select('id, nama_lengkap, unit_id')
    .eq('id', parsed.data.customer_id)
    .maybeSingle();
  if (!customer) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);
  const unitId = customer.unit_id as number | null;
  if (!unitId) return err('NO_UNIT', 'Customer tidak memiliki unit.', 422);
  if (parsed.data.bank_kpr_id) {
    const { data: bank } = await db.from('bank_kpr').select('id').eq('id', parsed.data.bank_kpr_id).maybeSingle();
    if (!bank) return err('NOT_FOUND', 'Bank KPR tidak ditemukan.', 404);
  }

  // Ubah status unit ke SP3K dulu; gagal → 422, belum ada data yang disimpan
  const r = await changeUnitStatus({
    unitId,
    toStatusName: 'SP3K',
    userId: auth.user.id,
    isSuperadmin: auth.user.role === 'SUPERADMIN',
    customerId: customer.id as number,
  });
  if (!r.ok) return err('STATUS_TRANSITION', r.error ?? 'Gagal ubah status unit.', 422);

  const { data, error } = await db
    .from('sp3k_records')
    .insert({
      customer_id: parsed.data.customer_id,
      tanggal_pencairan: parsed.data.tanggal_pencairan ?? null,
      nominal: parsed.data.nominal ?? null,
      bank_kpr_id: parsed.data.bank_kpr_id ?? null,
      keterangan: parsed.data.keterangan ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(
    auth.user.id,
    `catat SP3K customer ${customer.nama_lengkap as string}`,
    'sp3k_records',
    data.id
  );
  return ok(data, undefined, 201);
}
