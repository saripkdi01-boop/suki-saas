import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge, StatusBadge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, cx } from '@/lib/format';
import { ToggleReadyButton } from './Buttons';

const MENU = '/admin/unit-ready';
const PER_PAGE = 20;

interface UnitRow {
  id: number;
  kode_kavling: string;
  harga_jual: number | string | null;
  is_ready: boolean;
  locations: { nama: string } | null;
  unit_statuses: { nama: string; warna_hex: string | null } | null;
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function UnitReadyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const locationId = str(sp.location_id) || '';
  const db = supabaseAdmin();

  const { data: locs } = await db.from('locations').select('id, nama').order('nama');
  const locations = ((locs ?? []) as Array<{ id: number; nama: string }>);

  let query = db
    .from('units')
    .select('id, kode_kavling, harga_jual, is_ready, locations(nama), unit_statuses(nama, warna_hex)', { count: 'exact' })
    .is('deleted_at', null)
    .order('kode_kavling');
  if (locationId) query = query.eq('location_id', Number(locationId));
  if (q) query = query.ilike('kode_kavling', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as UnitRow[];

  const canEdit = me ? await can(me, MENU, 'edit') : false;

  const columns: Column<UnitRow>[] = [
    { header: 'Kode', render: (r) => <span className="font-bold">{r.kode_kavling}</span> },
    { header: 'Lokasi', render: (r) => r.locations?.nama ?? '-' },
    { header: 'Harga', className: 'text-right', render: (r) => rp(r.harga_jual) },
    {
      header: 'Status',
      render: (r) =>
        r.unit_statuses ? <StatusBadge nama={r.unit_statuses.nama} warna={r.unit_statuses.warna_hex} /> : '-',
    },
    {
      header: 'Ready',
      render: (r) =>
        r.is_ready ? <Badge color="#059669">Ya</Badge> : <Badge>Belum</Badge>,
    },
    {
      header: 'Aksi',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {canEdit && <ToggleReadyButton id={r.id} isReady={r.is_ready} />}
          <a
            href="/admin/master/kavling"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Edit
          </a>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Unit Ready" subtitle="Kelola penanda ready (siap jual) tiap unit kavling" />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href={MENU}
            className={cx(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition',
              !locationId
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
            )}
          >
            Semua
          </a>
          {locations.map((l) => (
            <a
              key={l.id}
              href={`${MENU}?location_id=${l.id}`}
              className={cx(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition',
                locationId === String(l.id)
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
              )}
            >
              {l.nama}
            </a>
          ))}
        </div>
        <div className="mb-4">
          <SearchBox placeholder="Cari kode kavling…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada unit." />
      </Card>
    </div>
  );
}
