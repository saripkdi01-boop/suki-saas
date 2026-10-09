import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import {
  ParamSelect,
  SaluranCreateButton,
  SaluranEditButton,
  SaluranDeleteButton,
} from './Buttons';

const MENU = '/admin/op-saluran/saluran';
const PER_PAGE = 20;

interface Row {
  id: number;
  project_id: number;
  nama: string;
  panjang_m: number | string | null;
}

export default async function SaluranPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const rawPid = sp.project_id;
  const projectId = (Array.isArray(rawPid) ? rawPid[0] : rawPid) ?? '';

  const { data: projs } = await supabaseAdmin()
    .from('channel_projects')
    .select('id, nama, locations(nama)')
    .order('nama');
  const projectOptions = ((projs ?? []) as unknown as { id: number; nama: string; locations: { nama: string } | null }[]).map(
    (p) => ({ value: String(p.id), label: `${p.nama} — ${p.locations?.nama ?? '-'}` })
  );
  const activeProject = projectOptions.find((o) => o.value === projectId);

  let rows: Row[] = [];
  let total = 0;
  if (projectId) {
    let query = supabaseAdmin()
      .from('channels')
      .select('*', { count: 'exact' })
      .eq('project_id', Number(projectId))
      .order('nama');
    if (q) query = query.ilike('nama', `%${q}%`);
    const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
    rows = (data ?? []) as Row[];
    total = count ?? 0;
  }

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama Saluran', render: (r) => <span className="font-medium">{r.nama}</span> },
    {
      header: 'Panjang (m)',
      render: (r) => (r.panjang_m === null || r.panjang_m === undefined ? '-' : Number(r.panjang_m).toLocaleString('id-ID')),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <SaluranEditButton row={r} projectId={projectId} />}
          {canDelete && <SaluranDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Saluran"
        subtitle={activeProject ? `Proyek: ${activeProject.label}` : 'Pilih proyek untuk melihat daftar saluran'}
        actions={canCreate && projectId ? <SaluranCreateButton projectId={projectId} /> : undefined}
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <ParamSelect param="project_id" options={projectOptions} placeholder="— Pilih Proyek —" />
          {projectId && <SearchBox placeholder="Cari saluran…" />}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={total}
          perPage={perPage}
          emptyTitle={projectId ? 'Belum ada data' : 'Pilih proyek terlebih dahulu'}
          emptyHint={
            projectId
              ? 'Belum ada saluran untuk proyek ini. Tambahkan via tombol di atas.'
              : 'Gunakan pilihan proyek di atas untuk menampilkan data.'
          }
        />
      </Card>
    </div>
  );
}
