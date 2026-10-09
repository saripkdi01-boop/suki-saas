import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { uploadToBucket, safeFileName } from '@/lib/upload';

const MENU = '/admin/transaksi/ganti-nama';

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
    .from('name_changes')
    .select('*, customer_lama:customers!name_changes_customer_lama_id_fkey!inner(nama_lengkap)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customer_lama.nama_lengkap', `%${q}%`);
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

  const customerLamaId = Number(form.get('customer_lama_id'));
  const namaBaru = String(form.get('nama_baru') ?? '').trim();
  const nikBaru = String(form.get('nik_baru') ?? '').trim() || null;
  const noHpBaru = String(form.get('no_hp_baru') ?? '').trim() || null;
  const alamatBaru = String(form.get('alamat_baru') ?? '').trim() || null;
  const biayaGantiNama = Number(form.get('biaya_ganti_nama')) || 0;
  const tanggal = String(form.get('tanggal') || todayWita());

  if (!Number.isInteger(customerLamaId) || customerLamaId <= 0) {
    return err('VALIDATION', 'Customer lama wajib dipilih.', 422);
  }
  if (!namaBaru) return err('VALIDATION', 'Nama baru wajib diisi.', 422);

  const db = supabaseAdmin();

  const { data: lama } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id, status_id, marketing_id, jenis_pembelian')
    .eq('id', customerLamaId)
    .maybeSingle();
  const custLama = lama as {
    id: number;
    nama_lengkap: string;
    unit_id: number | null;
    status_id: number | null;
    marketing_id: number | null;
    jenis_pembelian: string | null;
  } | null;
  if (!custLama) return err('VALIDATION', 'Customer lama tidak ditemukan.', 422);
  if (!custLama.unit_id || !custLama.status_id) {
    return err('VALIDATION', 'Customer lama tidak memiliki unit/status aktif.', 422);
  }

  // Upload bukti bila ada
  const file = form.get('file');
  const hasFile = file instanceof File && file.size > 0;
  let buktiUrl: string | null = null;
  if (hasFile) {
    buktiUrl = await uploadToBucket('bukti-bayar', file, `ganti-nama/${Date.now()}-${safeFileName(file.name)}`);
  }

  // (1) Buat customer baru mewarisi unit & status
  const { data: baru, error: e1 } = await db
    .from('customers')
    .insert({
      nama_lengkap: namaBaru,
      nik: nikBaru,
      no_hp: noHpBaru,
      alamat_ktp: alamatBaru,
      unit_id: custLama.unit_id,
      status_id: custLama.status_id,
      marketing_id: custLama.marketing_id,
      jenis_pembelian: custLama.jenis_pembelian,
    })
    .select()
    .single();
  if (e1) return err('DB_ERROR', e1.message, 500);

  // (2) Arsipkan customer lama
  const { error: e2 } = await db.from('customers').update({ is_archived: true }).eq('id', custLama.id);
  if (e2) return err('DB_ERROR', e2.message, 500);

  // (3) Catat riwayat ganti nama
  const { data: rec, error: e3 } = await db
    .from('name_changes')
    .insert({
      customer_lama_id: custLama.id,
      nama_baru: namaBaru,
      nik_baru: nikBaru,
      no_hp_baru: noHpBaru,
      alamat_baru: alamatBaru,
      biaya_ganti_nama: biayaGantiNama,
      bukti_url: buktiUrl,
      tanggal,
    })
    .select()
    .single();
  if (e3) return err('DB_ERROR', e3.message, 500);

  await logActivity(
    auth.user.id,
    `ganti nama customer ${custLama.nama_lengkap} → ${namaBaru}`,
    'name_changes',
    (rec as { id: number }).id
  );
  return ok(rec, undefined, 201);
}
