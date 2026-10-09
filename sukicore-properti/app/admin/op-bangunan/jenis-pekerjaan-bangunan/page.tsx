import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import {
  ParamSelect,
  JenisPekerjaanBangunanCreateButton,
  JenisPekerjaanBangunanEditButton,
  JenisPekerjaanBangunanDeleteButton,
} from './Buttons';

const MENU = '/admin/op-bangunan/jenis-pekerjaan-bangunan';
const PER_PAGE = 20;

interface Row {
  id: number;
  project_id: number;
  nama: string;
  bobot_persen: number | string | null;
  progress: number;
}

export default async function JenisPekerjaanBangunanPage({
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
    .from('building_projects')
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
      .from('building_work_types')
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
    { header: 'Nama Pekerjaan', render: (r) => <span className="font-medium">{r.nama}</span> },
    {
      header: 'Bobot (%)',
      render: (r) => (r.bobot_persen === null || r.bobot_persen === undefined ? '-' : `${Number(r.bobot_persen)}%`),
    },
    {
      header: 'Progress',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.progress}%` }} />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-300">{r.progress}%</span>
        </div>
      ),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <JenisPekerjaanBangunanEditButton row={r} projectId={projectId} />}
          {canDelete && <JenisPekerjaanBangunanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Jenis Pekerjaan Bangunan"
        subtitle={
          activeProject ? `Proyek: ${activeProject.label}` : 'Pilih proyek untuk melihat jenis pekerjaannya'
        }
        actions={
          canCreate && projectId ? (
            <JenisPekerjaanBangunanCreateButton projectId={projectId} />
          ) : undefined
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <ParamSelect param="project_id" options={projectOptions} placeholder="— Pilih Proyek —" />
          {projectId && <SearchBox placeholder="Cari pekerjaan…" />}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={total}
          perPage={perPage}
          emptyTitle={projectId ? 'Belum ada data' : 'Pilih proyek terlebih dahulu'}
          emptyHint={
            projectId
              ? 'Belum ada jenis pekerjaan untuk proyek ini. Tambahkan via tombol di atas.'
              : 'Gunakan pilihan proyek di atas untuk menampilkan data.'
          }
        />
      </Card>
    </div>
  );
}
