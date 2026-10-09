import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';

const MENU = '/admin/keuangan/laporan-arus-kas';

export interface CashflowRow {
  tanggal: string;
  keterangan: string | null;
  kategori: string | null;
  masuk: number;
  keluar: number;
}

export interface CashflowResult {
  tahun: number;
  bulan: number | null;
  rekening_id: number | null;
  total_masuk: number;
  total_keluar: number;
  saldo: number;
  rincian: CashflowRow[];
}

function periodRange(tahun: number, bulan: number | null): { from: string; to: string } {
  if (bulan) {
    const nm = bulan === 12 ? 1 : bulan + 1;
    const ny = bulan === 12 ? tahun + 1 : tahun;
    return {
      from: `${tahun}-${String(bulan).padStart(2, '0')}-01`,
      to: `${ny}-${String(nm).padStart(2, '0')}-01`,
    };
  }
  return { from: `${tahun}-01-01`, to: `${tahun + 1}-01-01` };
}

/** Hitung arus kas dari incomes + expenses untuk periode tertentu. */
export async function computeCashflow(
  tahun: number,
  bulan: number | null,
  rekeningId: number | null
): Promise<CashflowResult> {
  const db = supabaseAdmin();
  const { from, to } = periodRange(tahun, bulan);
  let iq = db
    .from('incomes')
    .select('tanggal, jumlah, keterangan, finance_categories(nama)')
    .gte('tanggal', from)
    .lt('tanggal', to)
    .order('tanggal', { ascending: false });
  let eq = db
    .from('expenses')
    .select('tanggal, jumlah, keterangan, finance_categories(nama)')
    .gte('tanggal', from)
    .lt('tanggal', to)
    .order('tanggal', { ascending: false });
  if (rekeningId) {
    iq = iq.eq('rekening_id', rekeningId);
    eq = eq.eq('rekening_id', rekeningId);
  }
  const [{ data: ins }, { data: exps }] = await Promise.all([iq, eq]);
  const rincian: CashflowRow[] = [];
  let totalMasuk = 0;
  let totalKeluar = 0;
  type RawR = { tanggal: string; jumlah: number | string; keterangan: string | null; finance_categories: { nama: string } | { nama: string }[] | null };
  const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  for (const r of ((ins ?? []) as RawR[])) {
    const j = Number(r.jumlah);
    totalMasuk += j;
    rincian.push({ tanggal: r.tanggal, keterangan: r.keterangan, kategori: one(r.finance_categories)?.nama ?? null, masuk: j, keluar: 0 });
  }
  for (const r of ((exps ?? []) as RawR[])) {
    const j = Number(r.jumlah);
    totalKeluar += j;
    rincian.push({ tanggal: r.tanggal, keterangan: r.keterangan, kategori: one(r.finance_categories)?.nama ?? null, masuk: 0, keluar: j });
  }
  rincian.sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
  return {
    tahun,
    bulan,
    rekening_id: rekeningId,
    total_masuk: totalMasuk,
    total_keluar: totalKeluar,
    saldo: totalMasuk - totalKeluar,
    rincian,
  };
}

/** GET /api/v1/finance/cashflow?tahun=2026&bulan=10&rekening_id=1 */
export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const u = new URL(req.url);
  const tahun = Number(u.searchParams.get('tahun')) || new Date().getFullYear();
  const bulanRaw = u.searchParams.get('bulan');
  const bulan = bulanRaw && /^[1-9]$|^1[0-2]$/.test(bulanRaw) ? Number(bulanRaw) : null;
  const rekRaw = u.searchParams.get('rekening_id');
  const rekeningId = rekRaw ? Number(rekRaw) : null;
  try {
    const result = await computeCashflow(tahun, bulan, rekeningId);
    return ok(result);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}
