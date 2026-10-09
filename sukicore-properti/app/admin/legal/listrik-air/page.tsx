import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { ListrikAirCreateButton, ListrikAirEditButton, ListrikAirDeleteButton } from './Buttons';

const MENU = '/admin/legal/listrik-air';
const PER_PAGE = 20;

interface Row {
  id: number;
  unit_id: number;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  no_rekening_listrik: string | null;
  updated_at: string;
  units: { kode_kavling: string; locations: { nama: string } | null } | null;
}

export default async function ListrikAirPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  const { data: unitList } = await supabaseAdmin()
    .from('units')
    .select('id, kode_kavling, locations(nama)')
    .order('kode_kavling')
    .limit(2000);
  const unitOptions = ((unitList ?? []) as unknown as { id: number; kode_kavling: string; locations: { nama: string } | null }[]).map(
    (u) => ({ value: String(u.id), label: `${u.kode_kavling} — ${u.locations?.nama ?? '-'}` })
  );

  let query = supabaseAdmin()
    .from('utility_status')
    .select('*, units!inner(kode_kavling, locations(nama))', { count: 'exact' })
    .order('id');
  if (q) query = query.ilike('units.kode_kavling', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    {
      header: 'Unit',
      render: (r) => (
        <span className="font-medium">
          {r.units?.kode_kavling ?? '-'}
          <span className="ml-2 text-xs text-slate-500">{r.units?.locations?.nama ?? ''}</span>
        </span>
      ),
    },
    {
      header: 'Listrik',
      render: (r) =>
        r.listrik_terpasang ? (
          <Badge color="#059669">Terpasang</Badge>
        ) : (
          <Badge color="#dc2626">Belum</Badge>
        ),
    },
    {
      header: 'Air',
      render: (r) =>
        r.air_terpasang ? <Badge color="#059669">Terpasang</Badge> : <Badge color="#dc2626">Belum</Badge>,
    },
    { header: 'No. Rekening Listrik', render: (r) => r.no_rekening_listrik ?? '-' },
    { header: 'Diperbarui', render: (r) => tglWita(r.updated_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <ListrikAirEditButton row={r} />}
          {canDelete && <ListrikAirDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Listrik & Air"
        subtitle="Status pemasangan listrik dan air per unit"
        actions={canCreate ? <ListrikAirCreateButton units={unitOptions} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari kode kavling…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada data utilitas. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
