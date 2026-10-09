import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { HoldCreateButton, HoldVerifyButtons, HoldDeleteButton, type HoldRow } from './Buttons';

const MENU = '/admin/pengajuan-hold';
const PER_PAGE = 20;

const STATUS_COLOR: Record<string, string> = {
  pending: '#d97706',
  approved: '#059669',
  rejected: '#dc2626',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

interface HoldListRow extends HoldRow {
  status: string;
  created_at: string;
  units: { kode_kavling: string } | null;
  customers: { nama_lengkap: string } | null;
}

export default async function PengajuanHoldPage({
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
    .from('hold_requests')
    .select('*, units(kode_kavling), customers(nama_lengkap)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (q) query = query.or(`catatan.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as HoldListRow[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  // Options: unit berstatus "Ready" + semua customer non-arsip
  const { data: readyStatus } = await db.from('unit_statuses').select('id').eq('nama', 'Ready').maybeSingle();
  const { data: readyUnits } = await db
    .from('units')
    .select('id, kode_kavling')
    .is('deleted_at', null)
    .eq('status_id', (readyStatus as { id: number } | null)?.id ?? -1)
    .order('kode_kavling');
  const unitOpts = ((readyUnits ?? []) as Array<{ id: number; kode_kavling: string }>).map((u) => ({
    value: String(u.id),
    label: u.kode_kavling,
  }));
  const { data: custs } = await db
    .from('customers')
    .select('id, nama_lengkap')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const customerOpts = ((custs ?? []) as Array<{ id: number; nama_lengkap: string }>).map((c) => ({
    value: String(c.id),
    label: c.nama_lengkap,
  }));

  const columns: Column<HoldListRow>[] = [
    { header: 'Unit', render: (r) => <span className="font-semibold">{r.units?.kode_kavling ?? '-'}</span> },
    { header: 'Customer', render: (r) => r.customers?.nama_lengkap ?? '-' },
    { header: 'Jumlah', className: 'text-right', render: (r) => (r.jumlah ? rp(r.jumlah) : '-') },
    {
      header: 'Status',
      render: (r) => <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge>,
    },
    {
      header: 'Lampiran',
      render: (r) =>
        r.lampiran_url ? (
          <a href={r.lampiran_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline dark:text-emerald-400">
            Lihat
          </a>
        ) : (
          '-'
        ),
    },
    { header: 'Diajukan', render: (r) => <span className="whitespace-nowrap">{tglWita(r.created_at)}</span> },
    {
      header: 'Aksi',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {r.status === 'pending' && canEdit && <HoldVerifyButtons id={r.id} />}
          {canDelete && <HoldDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pengajuan Hold"
        subtitle="Daftar pengajuan hold unit — setujui untuk mengubah status unit menjadi Booking"
        actions={canCreate ? <HoldCreateButton unitOpts={unitOpts} customerOpts={customerOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari catatan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada pengajuan hold." />
      </Card>
    </div>
  );
}
