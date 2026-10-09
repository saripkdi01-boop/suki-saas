import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';

const MENU = '/admin/transaksi/pembelian-cancel';
const TABLE = 'cancellations';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

const schema = z.object({
  customer_id: reqId,
  alasan: optText,
  tanggal: optDate,
});

function todayWita(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select('*, customer:customers!inner(nama_lengkap), unit:units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customer.nama_lengkap', `%${q}%`);
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

  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', d.customer_id)
    .maybeSingle();
  const cust = customer as { id: number; nama_lengkap: string; unit_id: number | null } | null;
  if (!cust || !cust.unit_id) return err('VALIDATION', 'Customer tidak memiliki unit aktif.', 422);

  // Pastikan kavling tidak dimiliki customer lain yang masih aktif
  const { data: other } = await db
    .from('customers')
    .select('id')
    .eq('unit_id', cust.unit_id)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .neq('id', cust.id)
    .limit(1);
  if (other && other.length > 0) return err('VALIDATION', 'Kavling sudah milik orang lain.', 422);

  // Ambil status unit saat ini; bila bukan Ready → ubah ke User Cancel
  const { data: unit } = await db
    .from('units')
    .select('id, kode_kavling, unit_statuses!inner(nama)')
    .eq('id', cust.unit_id)
    .maybeSingle();
  const statusName = ((unit as { unit_statuses: { nama: string } } | null)?.unit_statuses ?? { nama: '' }).nama;
  const kodeKavling = (unit as { kode_kavling: string } | null)?.kode_kavling ?? `#${cust.unit_id}`;
  if (statusName !== 'Ready') {
    const r = await changeUnitStatus({
      unitId: cust.unit_id,
      toStatusName: 'User Cancel',
      userId: auth.user.id,
      isSuperadmin: auth.user.role === 'SUPERADMIN',
      reason: `Pembelian cancel: customer ${cust.nama_lengkap}`,
      customerId: cust.id,
    });
    if (!r.ok) return err('STATUS_TRANSITION', r.error ?? 'Gagal mengubah status unit.', 422);
  }

  const { data, error } = await db
    .from(TABLE)
    .insert({
      customer_id: cust.id,
      unit_id: cust.unit_id,
      alasan: d.alasan ?? null,
      tanggal: d.tanggal ?? todayWita(),
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(
    auth.user.id,
    `cancel pembelian customer ${cust.nama_lengkap} (unit ${kodeKavling})`,
    TABLE,
    (data as { id: number }).id
  );
  return ok(data, undefined, 201);
}
