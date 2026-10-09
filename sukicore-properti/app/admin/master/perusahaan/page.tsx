import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { PerusahaanCreateButton, PerusahaanEditButton, PerusahaanDeleteButton } from './Buttons';

const MENU = '/admin/master/perusahaan';
const PER_PAGE = 20;

interface Row {
  id: number;
  nama: string;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  created_at: string;
}

export default async function PerusahaanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('companies').select('*', { count: 'exact' }).order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
    { header: 'Alamat', render: (r) => r.alamat ?? '-' },
    { header: 'Telepon', render: (r) => r.telepon ?? '-' },
    { header: 'Email', render: (r) => r.email ?? '-' },
    { header: 'Dibuat', render: (r) => tglWita(r.created_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <PerusahaanEditButton row={r} />}
          {canDelete && <PerusahaanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Perusahaan"
        subtitle="Master data perusahaan developer"
        actions={canCreate ? <PerusahaanCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari perusahaan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada perusahaan. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
