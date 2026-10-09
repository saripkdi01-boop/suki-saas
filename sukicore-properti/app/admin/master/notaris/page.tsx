import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { NotarisCreateButton, NotarisEditButton, NotarisDeleteButton } from './Buttons';

const MENU = '/admin/master/notaris';
const PER_PAGE = 20;

interface Row {
  id: number;
  nama: string;
  alamat: string | null;
  telepon: string | null;
}

export default async function NotarisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('notaries').select('*', { count: 'exact' }).order('nama');
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
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <NotarisEditButton row={r} />}
          {canDelete && <NotarisDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notaris"
        subtitle="Master notaris rekanan"
        actions={canCreate ? <NotarisCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari notaris…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada notaris. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
