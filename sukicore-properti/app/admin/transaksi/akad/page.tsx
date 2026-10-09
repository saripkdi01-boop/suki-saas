import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita, toDateInput } from '@/lib/format';
import {
  AkadScheduleCreateButton,
  AkadScheduleEditButton,
  AkadScheduleDeleteButton,
  ParticipantAddButton,
  ParticipantDeleteButton,
} from './Buttons';

const MENU = '/admin/transaksi/akad';
const PER_PAGE = 20;

interface ScheduleRow {
  id: number;
  tanggal: string;
  keterangan: string | null;
}

interface ParticipantRow {
  id: number;
  customer_id: number;
  customers: { id: number; nama_lengkap: string; units: { kode_kavling: string } | null };
}

const pickCls =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100';

export default async function AkadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const scheduleId = str(sp.schedule_id);
  const scheduleIdNum = /^\d+$/.test(scheduleId) ? Number(scheduleId) : null;

  let qSchedules = db
    .from('akad_schedules')
    .select('id, tanggal, keterangan', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) qSchedules = qSchedules.ilike('keterangan', `%${q}%`);
  const { data: schedData, count: schedCount } = await qSchedules.range(
    (page - 1) * perPage,
    page * perPage - 1
  );
  const schedules = (schedData ?? []) as unknown as ScheduleRow[];

  // Hitung jumlah peserta per jadwal (sederhana: fetch semua lalu hitung di JS)
  const { data: allParts } = await db.from('akad_participants').select('id, akad_schedule_id');
  const countMap = new Map<number, number>();
  for (const p of ((allParts ?? []) as { id: number; akad_schedule_id: number }[])) {
    countMap.set(p.akad_schedule_id, (countMap.get(p.akad_schedule_id) ?? 0) + 1);
  }

  // Jadwal terpilih (bila schedule_id valid)
  let selected: ScheduleRow | null = null;
  let participants: ParticipantRow[] = [];
  if (scheduleIdNum) {
    const { data: sched } = await db
      .from('akad_schedules')
      .select('id, tanggal, keterangan')
      .eq('id', scheduleIdNum)
      .maybeSingle();
    if (sched) {
      selected = sched as unknown as ScheduleRow;
      const { data: partData } = await db
        .from('akad_participants')
        .select('id, customer_id, customers!inner(id, nama_lengkap, units(kode_kavling))')
        .eq('akad_schedule_id', scheduleIdNum)
        .order('id');
      participants = (partData ?? []) as unknown as ParticipantRow[];
    }
  }

  const { data: custData } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_statuses!inner(nama)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const sp3kCustomerOpts = ((custData ?? []) as unknown as {
    id: number;
    nama_lengkap: string;
    unit_statuses: { nama: string };
  }[])
    .filter((c) => c.unit_statuses?.nama === 'SP3K')
    .map((c) => ({ value: String(c.id), label: c.nama_lengkap }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const scheduleColumns: Column<ScheduleRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="font-medium">{tglWita(r.tanggal)}</span> },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    { header: 'Peserta', render: (r) => String(countMap.get(r.id) ?? 0) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <a href={`?schedule_id=${r.id}`} className={pickCls}>
            Pilih
          </a>
          {canEdit && (
            <AkadScheduleEditButton
              row={{ id: r.id, tanggal: toDateInput(r.tanggal), keterangan: r.keterangan }}
            />
          )}
          {canDelete && <AkadScheduleDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  const participantColumns: Column<ParticipantRow>[] = [
    {
      header: 'Customer',
      render: (r) => <span className="font-medium">{r.customers?.nama_lengkap ?? '-'}</span>,
    },
    { header: 'Unit', render: (r) => r.customers?.units?.kode_kavling ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) =>
        selected && canDelete ? (
          <div className="flex justify-end gap-2">
            <ParticipantDeleteButton scheduleId={selected.id} customerId={r.customer_id} />
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Akad"
        subtitle="Jadwal akad & peserta"
        actions={canCreate ? <AkadScheduleCreateButton /> : undefined}
      />
      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Jadwal Akad</h2>
        <div className="mb-4">
          <SearchBox placeholder="Cari keterangan…" />
        </div>
        <DataTable
          columns={scheduleColumns}
          rows={schedules}
          total={schedCount ?? 0}
          perPage={perPage}
          emptyHint="Belum ada jadwal akad. Tambahkan via tombol di atas."
        />
      </Card>
      {selected && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Peserta Akad — {tglWita(selected.tanggal)}
            </h2>
            <div className="flex gap-2">
              {canCreate && (
                <ParticipantAddButton scheduleId={selected.id} customers={sp3kCustomerOpts} />
              )}
              <a href="?" className={pickCls}>
                ← Semua jadwal
              </a>
            </div>
          </div>
          <DataTable
            columns={participantColumns}
            rows={participants}
            total={participants.length}
            perPage={100}
            emptyTitle="Belum ada peserta"
            emptyHint="Tambahkan peserta dari customer berstatus SP3K."
          />
        </Card>
      )}
    </div>
  );
}
