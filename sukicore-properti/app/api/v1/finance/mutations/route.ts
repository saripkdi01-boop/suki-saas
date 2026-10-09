import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate } from '@/lib/api';

const MENU = '/admin/keuangan/mutasi-saldo';

/** Daftar mutasi saldo (read-only). Filter: rekening_id, bulan (YYYY-MM), q. */
export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  const u = new URL(req.url);
  const rekeningId = u.searchParams.get('rekening_id');
  const bulan = u.searchParams.get('bulan'); // YYYY-MM
  let query = supabaseAdmin()
    .from('balance_mutations')
    .select('*, bank_transaksi(nama_bank, no_rekening)', { count: 'exact' })
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });
  if (rekeningId) query = query.eq('rekening_id', Number(rekeningId));
  if (bulan && /^\d{4}-\d{2}$/.test(bulan)) {
    const [y, m] = bulan.split('-').map(Number);
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    query = query
      .gte('tanggal', `${y}-${String(m).padStart(2, '0')}-01`)
      .lt('tanggal', `${ny}-${String(nm).padStart(2, '0')}-01`);
  }
  if (q) query = query.ilike('keterangan', `%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}
