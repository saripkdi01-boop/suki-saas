import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, StatusBadge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp } from '@/lib/format';
import { KavlingCreateButton, KavlingEditButton, KavlingDeleteButton, KavlingFilters } from './Buttons';

const MENU = '/admin/master/kavling';
const PER_PAGE = 20;

interface Row {
  id: number;
  kode_kavling: string;
  luas_tanah: number | null;
  luas_bangunan: number | null;
  harga_jual: number | null;
  is_ready: boolean;
  location_id: number;
  status_id: number | null;
  pjg_kanan: number | null;
  pjg_kiri: number | null;
  lbr_depan: number | null;
  lbr_belakang: number | null;
  daya_listrik: string | null;
  no_sertifikat: string | null;
  keterangan: string | null;
  progres_bangunan: number;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  locations: { nama: string };
  unit_statuses: { nama: string; warna_hex: string | null } | null;
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const linkCls =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100';

export default async function KavlingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const locationId = str(sp.location_id).trim();
  const statusId = str(sp.status_id).trim();
  const db = supabaseAdmin();

  let query = db
    .from('units')
    .select(
      'id, kode_kavling, luas_tanah, luas_bangunan, harga_jual, is_ready, location_id, status_id, pjg_kanan, pjg_kiri, lbr_depan, lbr_belakang, daya_listrik, no_sertifikat, keterangan, progres_bangunan, listrik_terpasang, air_terpasang, locations!inner(nama), unit_statuses(nama, warna_hex)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('kode_kavling');
  if (q) query = query.ilike('kode_kavling', `%${q}%`);
  if (locationId) query = query.eq('location_id', locationId);
  if (statusId) query = query.eq('status_id', statusId);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const { data: locs } = await db.from('locations').select('id, nama').order('nama');
  const { data: stats } = await db.from('unit_statuses').select('id, nama, warna_hex').order('urutan');
  const locOpts = ((locs ?? []) as { id: number; nama: string }[]).map((l) => ({ value: String(l.id), label: l.nama }));
  const statOpts = ((stats ?? []) as { id: number; nama: string }[]).map((s) => ({ value: String(s.id), label: s.nama }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const exportBase = `/api/v1/exports/kavling?${locationId ? `location_id=${locationId}&` : ''}`;

  const columns: Column<Row>[] = [
    { header: 'Kode', render: (r) => <span className="font-medium">{r.kode_kavling}</span> },
    { header: 'Lokasi', render: (r) => r.locations.nama },
    {
      header: 'Luas T / B (m²)',
      render: (r) => `${r.luas_tanah ?? '-'} / ${r.luas_bangunan ?? '-'}`,
    },
    { header: 'Harga', render: (r) => rp(r.harga_jual) },
    {
      header: 'Status',
      render: (r) =>
        r.unit_statuses ? <StatusBadge nama={r.unit_statuses.nama} warna={r.unit_statuses.warna_hex} /> : '-',
    },
    { header: 'Ready', render: (r) => (r.is_ready ? 'Ya' : 'Tidak') },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <KavlingEditButton row={r} locOpts={locOpts} statOpts={statOpts} />}
          {canDelete && <KavlingDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kavling"
        subtitle="Master unit / kavling perumahan"
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreate && <KavlingCreateButton locOpts={locOpts} statOpts={statOpts} />}
            <a href={`${exportBase}format=excel`} className={linkCls}>
              Ekspor Excel
            </a>
            <a href={`${exportBase}format=pdf`} className={linkCls}>
              Ekspor PDF
            </a>
          </div>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <SearchBox placeholder="Cari kode kavling…" />
          <KavlingFilters locOpts={locOpts} statOpts={statOpts} />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada kavling. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
