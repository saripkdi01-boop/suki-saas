import { requirePerm } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge, Stat, Field, Select, Input, Button } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';

const MENU = '/admin/keuangan/mutasi-saldo';
const PER_PAGE = 20;

interface MutasiRow {
  id: number;
  tanggal: string;
  rekening_id: number | null;
  tipe: string;
  jumlah: number | string;
  keterangan: string | null;
  ref_tabel: string | null;
  ref_id: number | null;
  bank_transaksi: { nama_bank: string; no_rekening: string } | null;
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function MutasiSaldoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const rekeningId = str(sp.rekening_id) || '';
  const bulan = str(sp.bulan) || ''; // YYYY-MM
  const db = supabaseAdmin();

  // Filter periode bulan
  let from: string | null = null;
  let to: string | null = null;
  if (/^\d{4}-\d{2}$/.test(bulan)) {
    const [y, m] = bulan.split('-').map(Number);
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    from = `${y}-${String(m).padStart(2, '0')}-01`;
    to = `${ny}-${String(nm).padStart(2, '0')}-01`;
  }

  let query = db
    .from('balance_mutations')
    .select('*, bank_transaksi(nama_bank, no_rekening)', { count: 'exact' })
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });
  if (rekeningId) query = query.eq('rekening_id', Number(rekeningId));
  if (from && to) query = query.gte('tanggal', from).lt('tanggal', to);
  if (q) query = query.ilike('keterangan', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as MutasiRow[];

  const { data: reks } = await db.from('bank_transaksi').select('id, nama_bank, no_rekening').order('nama_bank');

  // Saldo per rekening (total keseluruhan, mengikuti filter rekening bila ada)
  let saldoQ = db.from('balance_mutations').select('rekening_id, tipe, jumlah');
  if (rekeningId) saldoQ = saldoQ.eq('rekening_id', Number(rekeningId));
  const { data: allMut } = await saldoQ;
  const agg = new Map<number | null, { masuk: number; keluar: number }>();
  for (const m of (allMut ?? []) as Array<{ rekening_id: number | null; tipe: string; jumlah: number | string }>) {
    const cur = agg.get(m.rekening_id) ?? { masuk: 0, keluar: 0 };
    if (m.tipe === 'masuk') cur.masuk += Number(m.jumlah);
    else cur.keluar += Number(m.jumlah);
    agg.set(m.rekening_id, cur);
  }
  const rekName = new Map<number, string>();
  for (const r of (reks ?? []) as Array<{ id: number; nama_bank: string; no_rekening: string }>) {
    rekName.set(r.id, `${r.nama_bank} — ${r.no_rekening}`);
  }
  const saldoCards = [...agg.entries()].map(([rid, v]) => ({
    label: rid === null ? 'Tanpa rekening' : rekName.get(rid) ?? `Rekening #${rid}`,
    saldo: v.masuk - v.keluar,
    masuk: v.masuk,
    keluar: v.keluar,
  }));

  const columns: Column<MutasiRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Rekening', render: (r) => (r.bank_transaksi ? `${r.bank_transaksi.nama_bank} — ${r.bank_transaksi.no_rekening}` : '-') },
    {
      header: 'Tipe',
      render: (r) =>
        r.tipe === 'masuk' ? <Badge color="#16a34a">Masuk</Badge> : <Badge color="#dc2626">Keluar</Badge>,
    },
    {
      header: 'Jumlah',
      className: 'text-right',
      render: (r) => (
        <span className={r.tipe === 'masuk' ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-red-700 dark:text-red-400'}>
          {r.tipe === 'masuk' ? '+' : '−'}{rp(r.jumlah)}
        </span>
      ),
    },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    { header: 'Ref', render: (r) => (r.ref_tabel ? `${r.ref_tabel} #${r.ref_id}` : '-') },
  ];

  return (
    <div>
      <PageHeader title="Mutasi Saldo" subtitle="Riwayat mutasi tiap rekening — terbentuk otomatis dari pemasukan & pengeluaran" />
      {saldoCards.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {saldoCards.map((s) => (
            <Stat
              key={s.label}
              label={s.label}
              value={<span className={s.saldo >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>{rp(s.saldo)}</span>}
              sub={<>Masuk {rp(s.masuk)} • Keluar {rp(s.keluar)}</>}
            />
          ))}
        </div>
      )}
      <Card>
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Rekening">
            <Select name="rekening_id" defaultValue={rekeningId}>
              <option value="">Semua rekening</option>
              {(reks ?? []).map((r: { id: number; nama_bank: string; no_rekening: string }) => (
                <option key={r.id} value={r.id}>{r.nama_bank} — {r.no_rekening}</option>
              ))}
            </Select>
          </Field>
          <Field label="Bulan">
            <Input type="month" name="bulan" defaultValue={bulan} />
          </Field>
          <Button type="submit" variant="secondary">Terapkan</Button>
          <a href={MENU} className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200">
            Reset
          </a>
        </form>
        <div className="mb-4">
          <SearchBox placeholder="Cari keterangan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada mutasi saldo." />
      </Card>
    </div>
  );
}
