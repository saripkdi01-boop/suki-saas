import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';
import { uploadToBucket, safeFileName } from '@/lib/upload';

const MENU = '/admin/transaksi/pindah-unit';

/** YYYY-MM-DD dalam zona WITA. */
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
    .from('unit_transfers')
    .select(
      '*, customer:customers!inner(nama_lengkap), unit_lama:units!unit_transfers_unit_lama_id_fkey(kode_kavling), unit_baru:units!unit_transfers_unit_baru_id_fkey(kode_kavling)',
      { count: 'exact' }
    )
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

  const form = await req.formData().catch(() => null);
  if (!form) return err('BAD_FORM', 'Form tidak valid.', 400);

  const customerId = Number(form.get('customer_id'));
  const unitBaruId = Number(form.get('unit_baru_id'));
  if (!Number.isInteger(customerId) || customerId <= 0) return err('VALIDATION', 'Customer wajib dipilih.', 422);
  if (!Number.isInteger(unitBaruId) || unitBaruId <= 0) return err('VALIDATION', 'Unit baru wajib dipilih.', 422);

  const biayaAdmin = Number(form.get('biaya_admin')) || 0;
  const rekeningRaw = form.get('rekening_id');
  const rekeningId = rekeningRaw !== null && rekeningRaw !== '' ? Number(rekeningRaw) : null;
  const metodeBayar = String(form.get('metode_bayar') ?? '').trim() || null;
  if (metodeBayar && !['Transfer', 'Tunai'].includes(metodeBayar)) {
    return err('VALIDATION', 'Metode bayar tidak dikenal.', 422);
  }
  const tanggal = String(form.get('tanggal') || todayWita());

  const db = supabaseAdmin();

  // Validasi customer & unit lamanya
  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) return err('VALIDATION', 'Customer tidak ditemukan.', 422);
  const unitLamaId = (customer as { unit_id: number | null }).unit_id;
  if (!unitLamaId) return err('VALIDATION', 'Customer tidak memiliki unit aktif.', 422);

  // Validasi unit baru
  const { data: unitBaru } = await db
    .from('units')
    .select('id, kode_kavling, unit_statuses!inner(nama)')
    .eq('id', unitBaruId)
    .maybeSingle();
  if (!unitBaru) return err('VALIDATION', 'Unit baru tidak ditemukan.', 422);
  if ((unitBaru as { id: number }).id === unitLamaId) {
    return err('VALIDATION', 'Unit baru harus berbeda dari unit lama.', 422);
  }
  const suBaru = (unitBaru as unknown as { unit_statuses: { nama: string } | { nama: string }[] | null }).unit_statuses;
  const statusBaru = Array.isArray(suBaru) ? suBaru[0]?.nama ?? '' : suBaru?.nama ?? '';
  if (statusBaru !== 'Ready') return err('VALIDATION', 'Unit baru tidak berstatus Ready.', 422);

  const { data: unitLama } = await db.from('units').select('id, kode_kavling').eq('id', unitLamaId).maybeSingle();
  const kodeLama = (unitLama as { kode_kavling: string } | null)?.kode_kavling ?? `#${unitLamaId}`;
  const kodeBaru = (unitBaru as { kode_kavling: string }).kode_kavling;

  // Upload bukti bila ada
  const file = form.get('file');
  const hasFile = file instanceof File && file.size > 0;
  let buktiUrl: string | null = null;
  if (hasFile) {
    buktiUrl = await uploadToBucket('bukti-bayar', file, `pindah-unit/${Date.now()}-${safeFileName(file.name)}`);
  }

  // (1) Catat transfer
  const { data: tr, error: e1 } = await db
    .from('unit_transfers')
    .insert({
      customer_id: customerId,
      unit_lama_id: unitLamaId,
      unit_baru_id: unitBaruId,
      biaya_admin: biayaAdmin,
      rekening_id: rekeningId && Number.isInteger(rekeningId) && rekeningId > 0 ? rekeningId : null,
      metode_bayar: metodeBayar,
      bukti_url: buktiUrl,
      tanggal,
    })
    .select()
    .single();
  if (e1) return err('DB_ERROR', e1.message, 500);

  // (2) Pindahkan unit customer
  const { error: e2 } = await db.from('customers').update({ unit_id: unitBaruId }).eq('id', customerId);
  if (e2) return err('DB_ERROR', e2.message, 500);

  // (3) Unit lama kembali Ready (override, tidak ada transisi legal ke Ready)
  const r1 = await changeUnitStatus({
    unitId: unitLamaId,
    toStatusName: 'Ready',
    userId: auth.user.id,
    isSuperadmin: auth.user.role === 'SUPERADMIN',
    operation: 'pindah-unit',
    reason: `Pindah unit: customer ${(customer as { nama_lengkap: string }).nama_lengkap} → unit ${kodeBaru}`,
  });
  if (!r1.ok) return err('STATUS_TRANSITION', r1.error ?? 'Gagal mengubah status unit lama.', 422);

  // (4) Unit baru → Booking Fee
  const r2 = await changeUnitStatus({
    unitId: unitBaruId,
    toStatusName: 'Booking Fee',
    userId: auth.user.id,
    isSuperadmin: auth.user.role === 'SUPERADMIN',
    customerId,
  });
  if (!r2.ok) return err('STATUS_TRANSITION', r2.error ?? 'Gagal mengubah status unit baru.', 422);

  await logActivity(
    auth.user.id,
    `pindah unit customer ${(customer as { nama_lengkap: string }).nama_lengkap}: ${kodeLama} → ${kodeBaru}`,
    'unit_transfers',
    (tr as { id: number }).id
  );
  return ok(tr, undefined, 201);
}
