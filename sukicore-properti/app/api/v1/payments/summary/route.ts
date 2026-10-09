import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';

const MENU = '/admin/pembayaran';

/**
 * Ringkasan pembayaran per customer (non-arsip): total tagihan, total sudah bayar, sisa.
 * Hanya customer yang punya >= 1 pembayaran.
 */
export async function GET() {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;

  const { data, error } = await supabaseAdmin()
    .from('customers')
    .select('id, nama_lengkap, units(kode_kavling), payments(tagihan, sudah_bayar)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  if (error) return err('DB_ERROR', error.message, 500);

  const rows = (
    (data ?? []) as unknown as Array<{
      id: number;
      nama_lengkap: string;
      units: { kode_kavling: string } | null;
      payments: Array<{ tagihan: number | string; sudah_bayar: number | string }>;
    }>
  )
    .filter((c) => (c.payments ?? []).length > 0)
    .map((c) => {
      const total_tagihan = c.payments.reduce((s, p) => s + Number(p.tagihan ?? 0), 0);
      const total_bayar = c.payments.reduce((s, p) => s + Number(p.sudah_bayar ?? 0), 0);
      return {
        customer_id: c.id,
        nama_lengkap: c.nama_lengkap,
        unit_kode: c.units?.kode_kavling ?? null,
        total_tagihan,
        total_bayar,
        sisa: total_tagihan - total_bayar,
      };
    });

  return ok(rows);
}
