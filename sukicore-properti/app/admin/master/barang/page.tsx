import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp } from '@/lib/format';
import { BarangCreateButton, BarangEditButton, BarangDeleteButton } from './Buttons';

const MENU = '/admin/master/barang';
const PER_PAGE = 20;

interface Row {
  id: number;
  kode: string;
  nama: string;
  satuan_id: number | null;
  stok: number;
  harga_beli: number | null;
  units_of_measure: { nama: string } | null;
}

export default async function BarangPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let query = db.from('items').select('id, kode, nama, satuan_id, stok, harga_beli, units_of_measure(nama)', { count: 'exact' }).order('nama');
  if (q) query = query.or(`nama.ilike.%${q}%,kode.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const { data: satuans } = await db.from('units_of_measure').select('id, nama').order('nama');
  const satuanOpts = ((satuans ?? []) as { id: number; nama: string }[]).map((s) => ({
    value: String(s.id),
    label: s.nama,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Kode', render: (r) => <span className="font-medium">{r.kode}</span> },
    { header: 'Nama Barang', render: (r) => r.nama },
    { header: 'Satuan', render: (r) => r.units_of_measure?.nama ?? '-' },
    { header: 'Stok', className: 'text-right', render: (r) => r.stok.toLocaleString('id-ID') },
    { header: 'Harga Beli', className: 'text-right', render: (r) => rp(r.harga_beli) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <BarangEditButton row={r} satuanOpts={satuanOpts} />}
          {canDelete && <BarangDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Barang"
        subtitle="Master barang gudang"
        actions={canCreate ? <BarangCreateButton satuanOpts={satuanOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari kode / nama barang…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada barang. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
