import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { SatuanCreateButton, SatuanEditButton, SatuanDeleteButton } from './Buttons';

const MENU = '/admin/master/satuan';
const PER_PAGE = 20;

interface Row {
  id: number;
  nama: string;
  created_at: string;
}

export default async function SatuanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('units_of_measure').select('*', { count: 'exact' }).order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
    { header: 'Dibuat', render: (r) => tglWita(r.created_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <SatuanEditButton row={r} />}
          {canDelete && <SatuanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Satuan"
        subtitle="Master satuan barang (UNIT, SET, PCS, …)"
        actions={canCreate ? <SatuanCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari satuan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada satuan. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
