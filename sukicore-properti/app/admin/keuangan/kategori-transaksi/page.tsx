import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { KategoriCreateButton, KategoriEditButton, KategoriDeleteButton, type KategoriRow } from './Buttons';

const MENU = '/admin/keuangan/kategori-transaksi';
const PER_PAGE = 20;

export default async function KategoriTransaksiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin()
    .from('finance_categories')
    .select('*', { count: 'exact' })
    .order('tipe')
    .order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as KategoriRow[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<KategoriRow>[] = [
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
    {
      header: 'Tipe',
      render: (r) =>
        r.tipe === 'pemasukan' ? (
          <Badge color="#16a34a">Pemasukan</Badge>
        ) : (
          <Badge color="#dc2626">Pengeluaran</Badge>
        ),
    },
    { header: 'Dibuat', render: (r) => tglWita(r.created_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <KategoriEditButton row={r} />}
          {canDelete && <KategoriDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kategori Transaksi"
        subtitle="Kelompokkan pemasukan & pengeluaran (cth: Booking Fee, Gaji, Operasional)"
        actions={canCreate ? <KategoriCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari kategori…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada kategori. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
