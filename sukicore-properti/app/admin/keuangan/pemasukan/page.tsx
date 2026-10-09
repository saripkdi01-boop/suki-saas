import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { PemasukanCreateButton, PemasukanEditButton, PemasukanDeleteButton, type PemasukanRow } from './Buttons';

const MENU = '/admin/keuangan/pemasukan';
const PER_PAGE = 20;

export default async function PemasukanPage({
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
    .from('incomes')
    .select('*, finance_categories(nama), bank_transaksi(nama_bank, no_rekening), customers(nama_lengkap)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('keterangan', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as PemasukanRow[];

  const [{ data: kats }, { data: reks }, { data: custs }] = await Promise.all([
    db.from('finance_categories').select('id, nama').eq('tipe', 'pemasukan').order('nama'),
    db.from('bank_transaksi').select('id, nama_bank, no_rekening').order('nama_bank'),
    db.from('customers').select('id, nama_lengkap').order('nama_lengkap').limit(500),
  ]);
  const kategoriOpts = (kats ?? []).map((k: { id: number; nama: string }) => ({ value: String(k.id), label: k.nama }));
  const rekeningOpts = (reks ?? []).map((r: { id: number; nama_bank: string; no_rekening: string }) => ({
    value: String(r.id),
    label: `${r.nama_bank} — ${r.no_rekening}`,
  }));
  const customerOpts = (custs ?? []).map((c: { id: number; nama_lengkap: string }) => ({ value: String(c.id), label: c.nama_lengkap }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<PemasukanRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Kategori', render: (r) => r.finance_categories?.nama ?? '-' },
    {
      header: 'Rekening',
      render: (r) => (r.bank_transaksi ? `${r.bank_transaksi.nama_bank} — ${r.bank_transaksi.no_rekening}` : '-'),
    },
    { header: 'Customer', render: (r) => r.customers?.nama_lengkap ?? '-' },
    { header: 'Jumlah', className: 'text-right', render: (r) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{rp(r.jumlah)}</span> },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <PemasukanEditButton row={r} kategoriOpts={kategoriOpts} rekeningOpts={rekeningOpts} customerOpts={customerOpts} />}
          {canDelete && <PemasukanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pemasukan"
        subtitle="Catat pemasukan — otomatis tercatat sebagai mutasi saldo rekening"
        actions={canCreate ? <PemasukanCreateButton kategoriOpts={kategoriOpts} rekeningOpts={rekeningOpts} customerOpts={customerOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari keterangan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada pemasukan. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
