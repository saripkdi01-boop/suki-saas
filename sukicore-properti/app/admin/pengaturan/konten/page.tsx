import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { KontenCreateButton, KontenEditButton, KontenDeleteButton } from './Buttons';

const MENU = '/admin/pengaturan/konten';
const PER_PAGE = 20;

interface Row {
  id: number;
  key: string;
  judul: string;
  isi_html: string | null;
  posisi: string | null;
  updated_at: string;
}

export default async function KontenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('cms_contents').select('*', { count: 'exact' }).order('key');
  if (q) query = query.or(`key.ilike.%${q}%,judul.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Key', render: (r) => <span className="font-medium">{r.key}</span> },
    { header: 'Judul', render: (r) => r.judul },
    { header: 'Posisi', render: (r) => (r.posisi ? <Badge>{r.posisi}</Badge> : '-') },
    { header: 'Diubah', render: (r) => tglWita(r.updated_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <KontenEditButton row={r} />}
          {canDelete && <KontenDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Konten"
        subtitle="Kelola konten CMS (navbar, slider, dsb.)"
        actions={canCreate ? <KontenCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari key / judul…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada konten. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
