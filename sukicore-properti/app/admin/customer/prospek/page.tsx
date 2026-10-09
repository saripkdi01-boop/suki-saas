import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { ProspekCreateButton, ProspekEditButton, ProspekDeleteButton, type ProspekRow, type ProspekFormOptions } from './Buttons';

const MENU = '/admin/customer/prospek';
const PER_PAGE = 20;

const STATUS_LABEL: Record<string, string> = { baru: 'Baru', follow_up: 'Follow Up', deal: 'Deal', batal: 'Batal' };
const STATUS_COLOR: Record<string, string> = { baru: '#64748b', follow_up: '#d97706', deal: '#059669', batal: '#dc2626' };

interface Row extends ProspekRow {
  locations: { nama: string } | null;
  marketing: { nama: string } | null;
}

export default async function ProspekPage({
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
    .from('prospects')
    .select('id, nama_lengkap, no_hp, alamat, sumber, status, location_id, marketing_id, locations(nama), marketing(nama)', { count: 'exact' })
    .order('nama_lengkap');
  if (q) query = query.ilike('nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const [{ data: loc }, { data: mk }] = await Promise.all([
    db.from('locations').select('id, nama').order('nama'),
    db.from('marketing').select('id, nama').eq('is_active', true).order('nama'),
  ]);
  const options: ProspekFormOptions = {
    location: (loc ?? []).map((x) => ({ value: String(x.id), label: x.nama as string })),
    marketing: (mk ?? []).map((x) => ({ value: String(x.id), label: x.nama as string })),
  };

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama_lengkap}</span> },
    { header: 'No. HP', render: (r) => r.no_hp ?? '-' },
    { header: 'Lokasi', render: (r) => r.locations?.nama ?? '-' },
    { header: 'Marketing', render: (r) => r.marketing?.nama ?? '-' },
    { header: 'Sumber', render: (r) => r.sumber ?? '-' },
    {
      header: 'Status',
      render: (r) => (
        <Badge color={STATUS_COLOR[r.status] ?? '#64748b'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
      ),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <ProspekEditButton row={r} options={options} />}
          {canDelete && <ProspekDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Prospek"
        subtitle="Kelola data prospek / calon pembeli"
        actions={canCreate ? <ProspekCreateButton options={options} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama prospek…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada data prospek. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
