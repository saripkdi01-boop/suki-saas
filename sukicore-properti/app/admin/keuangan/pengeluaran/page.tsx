import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { PengeluaranCreateButton, PengeluaranEditButton, PengeluaranDeleteButton, type PengeluaranRow } from './Buttons';

const MENU = '/admin/keuangan/pengeluaran';
const PER_PAGE = 20;

export default async function PengeluaranPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let query = db
    .from('expenses')
    .select('*, finance_categories(nama), bank_transaksi(nama_bank, no_rekening)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('keterangan', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as PengeluaranRow[];

  const [{ data: kats }, { data: reks }] = await Promise.all([
    db.from('finance_categories').select('id, nama').eq('tipe', 'pengeluaran').order('nama'),
    db.from('bank_transaksi').select('id, nama_bank, no_rekening').order('nama_bank'),
  ]);
  const kategoriOpts = (kats ?? []).map((k: { id: number; nama: string }) => ({ value: String(k.id), label: k.nama }));
  const rekeningOpts = (reks ?? []).map((r: { id: number; nama_bank: string; no_rekening: string }) => ({
    value: String(r.id),
    label: `${r.nama_bank} — ${r.no_rekening}`,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<PengeluaranRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Kategori', render: (r) => r.finance_categories?.nama ?? '-' },
    {
      header: 'Rekening',
      render: (r) => (r.bank_transaksi ? `${r.bank_transaksi.nama_bank} — ${r.bank_transaksi.no_rekening}` : '-'),
    },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    { header: 'Jumlah', className: 'text-right', render: (r) => <span className="font-semibold text-red-700 dark:text-red-400">{rp(r.jumlah)}</span> },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <PengeluaranEditButton row={r} kategoriOpts={kategoriOpts} rekeningOpts={rekeningOpts} />}
          {canDelete && <PengeluaranDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pengeluaran"
        subtitle="Catat pengeluaran — otomatis tercatat sebagai mutasi saldo rekening"
        actions={canCreate ? <PengeluaranCreateButton kategoriOpts={kategoriOpts} rekeningOpts={rekeningOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari keterangan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada pengeluaran. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
