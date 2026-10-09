import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { getStatusIdByName } from '@/lib/status';
import { PageHeader, Card, SearchBox, StatusBadge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { CustomerCreateButton, CustomerEditButton, CustomerDeleteButton, type CustomerRow, type CustomerFormOptions } from './Buttons';

const MENU = '/admin/customer/customer';
const PER_PAGE = 20;

const LINK_STYLE =
  'inline-flex items-center rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100';

interface Row extends CustomerRow {
  units: { kode_kavling: string } | null;
  unit_statuses: { nama: string; warna_hex: string | null } | null;
  marketing: { nama: string } | null;
}

const SELECT =
  'id, nama_lengkap, nik, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, alamat_ktp, alamat_domisili, npwp, jenis_pembelian, marketing_id, admin_id, unit_id, status_id, ' +
  'units(kode_kavling), unit_statuses(nama, warna_hex), marketing(nama)';

export default async function CustomerPage({
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
    .select(SELECT, { count: 'exact' })
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  if (q) query = query.ilike('nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  // Props form
  const [{ data: mk }, { data: adm }, { data: sts }] = await Promise.all([
    db.from('marketing').select('id, nama').eq('is_active', true).order('nama'),
    db.from('admin_staff').select('id, nama').eq('is_active', true).order('nama'),
    db.from('unit_statuses').select('id, nama').order('urutan'),
  ]);
  const readyId = await getStatusIdByName('Ready');
  let unitQuery = db.from('units').select('id, kode_kavling').is('deleted_at', null).order('kode_kavling');
  if (readyId) unitQuery = unitQuery.eq('status_id', readyId);
  const { data: un } = await unitQuery;

  const opt = (list: Array<{ id: number; nama: string }> | null): { value: string; label: string }[] =>
    (list ?? []).map((x) => ({ value: String(x.id), label: x.nama }));
  const options: CustomerFormOptions = {
    marketing: opt(mk),
    admin: opt(adm),
    unit: (un ?? []).map((x) => ({ value: String(x.id), label: x.kode_kavling as string })),
    status: opt(sts),
  };

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama_lengkap}</span> },
    { header: 'Unit', render: (r) => <span className="font-mono">{r.units?.kode_kavling ?? '-'}</span> },
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
    { header: 'No. HP', render: (r) => r.no_hp ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <CustomerEditButton row={r} options={options} />}
          <a href={`/admin/customer/upload-file?customer_id=${r.id}`} className={LINK_STYLE}>
            File
          </a>
          <a href={`/api/v1/exports/subsidi-form/${r.id}`} target="_blank" rel="noreferrer" className={LINK_STYLE}>
            Subsidi
          </a>
          {canDelete && <CustomerDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customer"
        subtitle="Kelola data customer pembeli unit"
        actions={canCreate ? <CustomerCreateButton options={options} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada data customer. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
