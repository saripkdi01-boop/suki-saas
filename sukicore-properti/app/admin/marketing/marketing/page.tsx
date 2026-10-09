import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { MarketingCreateButton, MarketingEditButton, MarketingDeleteButton } from './Buttons';

const MENU = '/admin/marketing/marketing';
const PER_PAGE = 20;

interface Row {
  id: number;
  kode: string;
  nama: string;
  alamat: string | null;
  no_rekening: string | null;
  is_active: boolean;
}

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('marketing').select('*', { count: 'exact' }).order('nama');
  if (q) query = query.or(`nama.ilike.%${q}%,kode.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Kode', render: (r) => <span className="font-mono font-medium">{r.kode}</span> },
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
    { header: 'Alamat', render: (r) => r.alamat ?? '-' },
    { header: 'No. Rekening', render: (r) => r.no_rekening ?? '-' },
    {
      header: 'Aktif',
      render: (r) =>
        r.is_active ? <Badge color="#059669">Aktif</Badge> : <Badge color="#64748b">Nonaktif</Badge>,
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <MarketingEditButton row={r} />}
          {canDelete && <MarketingDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle="Kelola data marketing / agen penjualan"
        actions={canCreate ? <MarketingCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari kode atau nama marketing…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada data marketing. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
