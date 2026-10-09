import { requirePerm } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card, Stat, Field, Select, Input, Button } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';

const MENU = '/admin/keuangan/laporan-arus-kas';

interface Rincian {
  id: string;
  tanggal: string;
  keterangan: string | null;
  kategori: string | null;
  masuk: number;
  keluar: number;
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const BULAN_NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default async function LaporanArusKasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const sp = await searchParams;
  const tahunBerjalan = Number(
    new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', year: 'numeric' }).format(new Date())
  );
  const tahun = Number(str(sp.tahun)) || tahunBerjalan;
  const bulanRaw = str(sp.bulan);
  const bulan = /^[1-9]$|^1[0-2]$/.test(bulanRaw) ? Number(bulanRaw) : null;
  const rekeningId = str(sp.rekening_id) ? Number(str(sp.rekening_id)) : null;
  const db = supabaseAdmin();

  const from = bulan ? `${tahun}-${String(bulan).padStart(2, '0')}-01` : `${tahun}-01-01`;
  const to = bulan
    ? bulan === 12
      ? `${tahun + 1}-01-01`
      : `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    : `${tahun + 1}-01-01`;

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
  const [{ data: ins }, { data: exps }, { data: reks }] = await Promise.all([
    iq,
    eq,
    db.from('bank_transaksi').select('id, nama_bank, no_rekening').order('nama_bank'),
  ]);

  type R = { tanggal: string; jumlah: number | string; keterangan: string | null; finance_categories: { nama: string } | null };
  const rincian: Rincian[] = [];
  let totalMasuk = 0;
  let totalKeluar = 0;
  (ins ?? []).forEach((r, i) => {
    const rr = r as unknown as R;
    const j = Number(rr.jumlah);
    totalMasuk += j;
    rincian.push({ id: `m${i}`, tanggal: rr.tanggal, keterangan: rr.keterangan, kategori: rr.finance_categories?.nama ?? '-', masuk: j, keluar: 0 });
  });
  (exps ?? []).forEach((r, i) => {
    const rr = r as unknown as R;
    const j = Number(rr.jumlah);
    totalKeluar += j;
    rincian.push({ id: `k${i}`, tanggal: rr.tanggal, keterangan: rr.keterangan, kategori: rr.finance_categories?.nama ?? '-', masuk: 0, keluar: j });
  });
  rincian.sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));

  const qs = new URLSearchParams({ tahun: String(tahun) });
  if (bulan) qs.set('bulan', String(bulan));
  if (rekeningId) qs.set('rekening_id', String(rekeningId));

  const columns: Column<Rincian>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    { header: 'Kategori', render: (r) => r.kategori ?? '-' },
    {
      header: 'Masuk',
      className: 'text-right',
      render: (r) => (r.masuk > 0 ? <span className="text-emerald-700 dark:text-emerald-400">{rp(r.masuk)}</span> : '-'),
    },
    {
      header: 'Keluar',
      className: 'text-right',
      render: (r) => (r.keluar > 0 ? <span className="text-red-700 dark:text-red-400">{rp(r.keluar)}</span> : '-'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Laporan Arus Kas"
        subtitle={`Periode ${bulan ? `${BULAN_NAMA[bulan - 1]} ` : ''}${tahun}${rekeningId ? ' — 1 rekening' : ' — semua rekening'}`}
        actions={
          <>
            <a
              href={`/api/v1/exports/aruskas?${qs.toString()}&format=excel`}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ekspor Excel
            </a>
            <a
              href={`/api/v1/exports/aruskas?${qs.toString()}&format=pdf`}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
            >
              Ekspor PDF
            </a>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total Pemasukan" value={<span className="text-emerald-700 dark:text-emerald-400">{rp(totalMasuk)}</span>} />
        <Stat label="Total Pengeluaran" value={<span className="text-red-700 dark:text-red-400">{rp(totalKeluar)}</span>} />
        <Stat label="Saldo (Masuk − Keluar)" value={rp(totalMasuk - totalKeluar)} sub={`${rincian.length} baris transaksi`} />
      </div>
      <Card>
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Tahun">
            <Input type="number" name="tahun" defaultValue={tahun} min={2000} max={2100} className="w-28" />
          </Field>
          <Field label="Bulan">
            <Select name="bulan" defaultValue={bulan ? String(bulan) : ''}>
              <option value="">Semua bulan</option>
              {BULAN_NAMA.map((n, i) => (
                <option key={i + 1} value={i + 1}>{n}</option>
              ))}
            </Select>
          </Field>
          <Field label="Rekening">
            <Select name="rekening_id" defaultValue={rekeningId ? String(rekeningId) : ''}>
              <option value="">Semua rekening</option>
              {(reks ?? []).map((r: { id: number; nama_bank: string; no_rekening: string }) => (
                <option key={r.id} value={r.id}>{r.nama_bank} — {r.no_rekening}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary">Terapkan</Button>
        </form>
        <DataTable columns={columns} rows={rincian} total={rincian.length} perPage={50} emptyHint="Belum ada transaksi pada periode ini." />
      </Card>
    </div>
  );
}
