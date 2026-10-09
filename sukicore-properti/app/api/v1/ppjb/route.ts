import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';

const MENU = '/admin/transaksi/ppjb';
const TABLE = 'ppjb';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  tanggal: z.preprocess(emptyToUndef, z.string().min(1, 'Tanggal wajib diisi.')),
  no_ppjb: z.string().trim().min(1, 'No. PPJB wajib diisi.'),
  customer_id: reqId,
  nominal: optNum,
  keterangan: optText,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select('*, customer:customers!inner(nama_lengkap), unit:units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.or(`no_ppjb.ilike.%${q}%,customer.nama_lengkap.ilike.%${q}%`);
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
  const d = parsed.data;

  const db = supabaseAdmin();

  // Nomor PPJB harus unik
  const { data: dup } = await db.from(TABLE).select('id').eq('no_ppjb', d.no_ppjb).limit(1);
  if (dup && dup.length > 0) return err('DUPLICATE', 'Nomor PPJB sudah digunakan.', 409);

  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', d.customer_id)
    .maybeSingle();
  const cust = customer as { id: number; nama_lengkap: string; unit_id: number | null } | null;
  if (!cust || !cust.unit_id) return err('VALIDATION', 'Customer tidak memiliki unit aktif.', 422);

  // Ubah status unit ke Pembelian Cash DULU
  const r = await changeUnitStatus({
    unitId: cust.unit_id,
    toStatusName: 'Pembelian Cash',
    userId: auth.user.id,
    isSuperadmin: auth.user.role === 'SUPERADMIN',
    reason: `PPJB ${d.no_ppjb}: ${cust.nama_lengkap}`,
    customerId: cust.id,
  });
  if (!r.ok) return err('STATUS_TRANSITION', r.error ?? 'Gagal mengubah status unit.', 422);

  const { data, error } = await db
    .from(TABLE)
    .insert({
      tanggal: d.tanggal,
      no_ppjb: d.no_ppjb,
      customer_id: cust.id,
      unit_id: cust.unit_id,
      nominal: d.nominal ?? null,
      keterangan: d.keterangan ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, `tambah PPJB ${d.no_ppjb} untuk ${cust.nama_lengkap}`, TABLE, (data as { id: number }).id);
  return ok(data, undefined, 201);
}
