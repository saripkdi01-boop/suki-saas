import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { IssueForm, IssueDeleteButton, type BarangOpt } from './IssueForm';

const MENU = '/admin/barang-keluar';
const PER_PAGE = 20;

interface IssueRow {
  id: number;
  tanggal: string;
  tujuan: string;
  items: Array<{ kode: string; nama: string; qty: number; satuan: string }>;
  keterangan: string | null;
}

export default async function BarangKeluarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let query = db.from('goods_issues').select('*', { count: 'exact' }).order('tanggal', { ascending: false });
  if (q) query = query.ilike('tujuan', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as IssueRow[];

  const { data: brgData } = await db
    .from('items')
    .select('id, kode, nama, stok, units_of_measure(nama)')
    .order('kode')
    .limit(500);
  type RawBrg = { id: number; kode: string; nama: string; stok: number | string; units_of_measure: { nama: string } | { nama: string }[] | null };
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const barangs: BarangOpt[] = ((brgData ?? []) as RawBrg[]).map((b) => ({
    id: b.id,
    kode: b.kode,
    nama: b.nama,
    satuan: one(b.units_of_measure)?.nama ?? null,
    stok: Number(b.stok),
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<IssueRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Tujuan', render: (r) => <span className="font-medium">{r.tujuan}</span> },
    {
      header: 'Item',
      render: (r) => (
        <span title={(r.items ?? []).map((it) => `${it.kode} ×${it.qty}`).join(', ')}>
          {(r.items ?? []).length} item
        </span>
      ),
    },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canDelete && <IssueDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Barang Keluar"
        subtitle="Pengeluaran barang gudang — otomatis mengurangi stok (ditolak bila stok kurang)"
        actions={canCreate ? <IssueForm barangs={barangs} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari tujuan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada barang keluar." />
      </Card>
    </div>
  );
}
