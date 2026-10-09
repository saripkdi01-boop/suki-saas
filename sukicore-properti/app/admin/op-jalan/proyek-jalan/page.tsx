import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { ProyekJalanCreateButton, ProyekJalanEditButton, ProyekJalanDeleteButton } from './Buttons';

const MENU = '/admin/op-jalan/proyek-jalan';
const PER_PAGE = 20;

const STATUS_WARNA: Record<string, string> = {
  rencana: '#64748b',
  berjalan: '#2563eb',
  selesai: '#059669',
};
const STATUS_LABEL: Record<string, string> = {
  rencana: 'Rencana',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
};

interface Row {
  id: number;
  nama: string;
  location_id: number;
  tanggal_mulai: string | null;
  tanggal_target: string | null;
  progress: number;
  status: string;
  locations: { nama: string } | null;
}

export default async function ProyekJalanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  const { data: locs } = await supabaseAdmin().from('locations').select('id, nama').order('nama');
  const locationOptions = ((locs ?? []) as { id: number; nama: string }[]).map((l) => ({
    value: String(l.id),
    label: l.nama,
  }));

  let query = supabaseAdmin()
    .from('road_projects')
    .select('*, locations(nama)', { count: 'exact' })
    .order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama Proyek', render: (r) => <span className="font-medium">{r.nama}</span> },
    { header: 'Lokasi', render: (r) => r.locations?.nama ?? '-' },
    {
      header: 'Periode',
      render: (r) => (
        <span className="whitespace-nowrap">
          {tglWita(r.tanggal_mulai)} → {tglWita(r.tanggal_target)}
        </span>
      ),
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
      header: 'Status',
      render: (r) => <Badge color={STATUS_WARNA[r.status] ?? '#64748b'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>,
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <ProyekJalanEditButton row={r} locations={locationOptions} />}
          {canDelete && <ProyekJalanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Proyek Jalan"
        subtitle="Kelola proyek jalan per lokasi perumahan"
        actions={canCreate ? <ProyekJalanCreateButton locations={locationOptions} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari proyek jalan…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada proyek jalan. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
