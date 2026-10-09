import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, StatusBadge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { RestoreButton } from './Buttons';

const MENU = '/admin/customer/arsip-customer';
const PER_PAGE = 20;

interface Row {
  id: number;
  nama_lengkap: string;
  units: { kode_kavling: string } | null;
  unit_statuses: { nama: string; warna_hex: string | null } | null;
  marketing: { nama: string } | null;
}

export default async function ArsipCustomerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let query = db
    .from('customers')
    .select('id, nama_lengkap, units(kode_kavling), unit_statuses(nama, warna_hex), marketing(nama)', { count: 'exact' })
    .eq('is_archived', true)
    .is('deleted_at', null)
    .order('nama_lengkap');
  if (q) query = query.ilike('nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canRestore = me ? await can(me, MENU, 'edit') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama_lengkap}</span> },
    { header: 'Unit', render: (r) => r.units?.kode_kavling ?? '-' },
    {
      header: 'Status',
      render: (r) =>
        r.unit_statuses ? (
          <StatusBadge nama={r.unit_statuses.nama} warna={r.unit_statuses.warna_hex} />
        ) : (
          '-'
        ),
    },
    { header: 'Marketing', render: (r) => r.marketing?.nama ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">{canRestore && <RestoreButton id={r.id} />}</div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Arsip Customer" subtitle="Customer yang telah diarsipkan" />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Tidak ada customer yang diarsipkan." />
      </Card>
    </div>
  );
}
