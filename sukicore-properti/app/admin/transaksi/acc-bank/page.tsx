import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita, toDateInput, sisaHari } from '@/lib/format';
import {
  AccBankCreateButton,
  AccBankEditButton,
  AccBankDeleteButton,
  Sp3kCreateButton,
  Sp3kDeleteButton,
} from './Buttons';

const MENU = '/admin/transaksi/acc-bank';
const PER_PAGE = 20;

interface ApprovalRow {
  id: number;
  customer_id: number;
  plafon_acc: number | string | null;
  tgl_sp3k: string | null;
  tgl_expired: string | null;
  keterangan: string | null;
  customers: { id: number; nama_lengkap: string; units: { kode_kavling: string } | null };
}

interface Sp3kRow {
  id: number;
  customer_id: number;
  tanggal_pencairan: string | null;
  nominal: number | string | null;
  bank_kpr_id: number | null;
  keterangan: string | null;
  customers: { id: number; nama_lengkap: string };
  bank_kpr: { nama: string } | null;
}

export default async function AccBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let qApprovals = db
    .from('bank_approvals')
    .select(
      'id, customer_id, plafon_acc, tgl_sp3k, tgl_expired, keterangan, customers!inner(id, nama_lengkap, units(kode_kavling))',
      { count: 'exact' }
    )
    .order('tgl_sp3k', { ascending: false, nullsFirst: false });
  if (q) qApprovals = qApprovals.ilike('customers.nama_lengkap', `%${q}%`);
  const { data: approvalsData, count: approvalsCount } = await qApprovals.range(
    (page - 1) * perPage,
    page * perPage - 1
  );
  const approvals = (approvalsData ?? []) as unknown as ApprovalRow[];

  let qSp3k = db
    .from('sp3k_records')
    .select(
      'id, customer_id, tanggal_pencairan, nominal, bank_kpr_id, keterangan, customers!inner(id, nama_lengkap), bank_kpr(nama)',
      { count: 'exact' }
    )
    .order('tanggal_pencairan', { ascending: false, nullsFirst: false });
  if (q) qSp3k = qSp3k.ilike('customers.nama_lengkap', `%${q}%`);
  const { data: sp3kData, count: sp3kCount } = await qSp3k.range((page - 1) * perPage, page * perPage - 1);
  const sp3kRows = (sp3kData ?? []) as unknown as Sp3kRow[];

  const { data: custData } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_statuses!inner(nama)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const customersAll = (custData ?? []) as unknown as {
    id: number;
    nama_lengkap: string;
    unit_statuses: { nama: string };
  }[];
  const customerOpts = customersAll.map((c) => ({ value: String(c.id), label: c.nama_lengkap }));
  const onProsesBankOpts = customersAll
    .filter((c) => c.unit_statuses?.nama === 'On Proses Bank')
    .map((c) => ({ value: String(c.id), label: c.nama_lengkap }));

  const { data: bankData } = await db.from('bank_kpr').select('id, nama').order('nama');
  const bankOpts = ((bankData ?? []) as { id: number; nama: string }[]).map((b) => ({
    value: String(b.id),
    label: b.nama,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const approvalColumns: Column<ApprovalRow>[] = [
    {
      header: 'Customer',
      render: (r) => <span className="font-medium">{r.customers?.nama_lengkap ?? '-'}</span>,
    },
    { header: 'Unit', render: (r) => r.customers?.units?.kode_kavling ?? '-' },
    { header: 'Plafon', render: (r) => rp(r.plafon_acc) },
    { header: 'Tgl SP3K', render: (r) => tglWita(r.tgl_sp3k) },
    { header: 'Tgl Expired', render: (r) => tglWita(r.tgl_expired) },
    {
      header: 'Sisa Hari',
      render: (r) => {
        const s = sisaHari(r.tgl_expired);
        if (s === null) return '-';
        const color = s < 0 ? '#dc2626' : s < 30 ? '#dc2626' : s < 60 ? '#d97706' : '#059669';
        return <Badge color={color}>{s < 0 ? `${s} hari (lewat)` : `${s} hari`}</Badge>;
      },
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && (
            <AccBankEditButton
              customers={customerOpts}
              row={{
                id: r.id,
                customer_id: r.customer_id,
                plafon_acc: r.plafon_acc,
                tgl_sp3k: toDateInput(r.tgl_sp3k),
                tgl_expired: toDateInput(r.tgl_expired),
                keterangan: r.keterangan,
              }}
            />
          )}
          {canDelete && <AccBankDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  const sp3kColumns: Column<Sp3kRow>[] = [
    {
      header: 'Customer',
      render: (r) => <span className="font-medium">{r.customers?.nama_lengkap ?? '-'}</span>,
    },
    { header: 'Tgl Pencairan', render: (r) => tglWita(r.tanggal_pencairan) },
    { header: 'Nominal', render: (r) => rp(r.nominal) },
    { header: 'Bank', render: (r) => r.bank_kpr?.nama ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">{canDelete && <Sp3kDeleteButton id={r.id} />}</div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="ACC Bank"
        subtitle="Persetujuan bank & pencatatan SP3K / pencairan kredit"
        actions={
          canCreate ? (
            <>
              <AccBankCreateButton customers={customerOpts} />
              <Sp3kCreateButton customers={onProsesBankOpts} banks={bankOpts} />
            </>
          ) : undefined
        }
      />
      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          Persetujuan Bank (ACC)
        </h2>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable
          columns={approvalColumns}
          rows={approvals}
          total={approvalsCount ?? 0}
          perPage={perPage}
          emptyHint="Belum ada data persetujuan bank."
        />
      </Card>
      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          SP3K / Pencairan Kredit
        </h2>
        <DataTable
          columns={sp3kColumns}
          rows={sp3kRows}
          total={sp3kCount ?? 0}
          perPage={perPage}
          emptyHint="Belum ada pencatatan SP3K."
        />
      </Card>
    </div>
  );
}
