import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';

const MENU = '/admin/siteplan/penjualan';

/** GET /api/v1/siteplan/unit/:id — detail kavling untuk modal siteplan (5 tab). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const unitId = Number(id);
  if (!Number.isInteger(unitId)) return err('VALIDATION', 'ID unit harus angka.', 422);

  const db = supabaseAdmin();
  const { data: unit, error } = await db
    .from('units')
    .select(
      'id, kode_kavling, pjg_kanan, pjg_kiri, lbr_depan, lbr_belakang, luas_tanah, luas_bangunan, harga_jual, daya_listrik, no_sertifikat, keterangan, progres_bangunan, is_ready, foto_urls, locations(nama), unit_statuses(nama, warna_hex)'
    )
    .eq('id', unitId)
    .is('deleted_at', null)
    .single();
  if (error || !unit) return err('NOT_FOUND', 'Unit tidak ditemukan.', 404);

  const { data: customer } = await db
    .from('customers')
    .select(
      'id, nama_lengkap, nik, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, alamat_ktp, alamat_domisili, npwp, jenis_pembelian, marketing(nama)'
    )
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerId = (customer as { id?: number } | null)?.id;
  const { data: paymentRows } = await db
    .from('payments')
    .select('jenis_tagihan, tagihan, sudah_bayar, tanggal')
    .eq(customerId ? 'customer_id' : 'unit_id', customerId ?? unitId)
    .order('tanggal');
  const payments = paymentRows ?? [];

  const { data: utility } = await db
    .from('utility_status')
    .select('listrik_terpasang, air_terpasang, no_rekening_listrik, foto_url')
    .eq('unit_id', unitId)
    .maybeSingle();

  return ok({ unit, customer: customer ?? null, payments, utility: utility ?? null });
}
