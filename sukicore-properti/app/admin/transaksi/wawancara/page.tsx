import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita, toDateInput } from '@/lib/format';
import { WawancaraCreateButton, WawancaraEditButton, WawancaraDeleteButton } from './WawancaraForm';

const MENU = '/admin/transaksi/wawancara';
const PER_PAGE = 20;

interface InterviewRow {
  id: number;
  customer_id: number;
  unit_id: number | null;
  bank_kpr_id: number | null;
  tanggal: string;
  catatan: string | null;
  customers: { id: number; nama_lengkap: string };
  units: { kode_kavling: string } | null;
  bank_kpr: { nama: string } | null;
}

export default async function WawancaraPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin()
    .from('interviews')
    .select(
      'id, customer_id, unit_id, bank_kpr_id, tanggal, catatan, customers!inner(id, nama_lengkap), units(kode_kavling), bank_kpr(nama)',
      { count: 'exact' }
    )
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customers.nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as InterviewRow[];

  const { data: custData } = await supabaseAdmin()
    .from('customers')
    .select('id, nama_lengkap')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const customerOpts = ((custData ?? []) as { id: number; nama_lengkap: string }[]).map((c) => ({
    value: String(c.id),
    label: c.nama_lengkap,
  }));

  const { data: bankData } = await supabaseAdmin().from('bank_kpr').select('id, nama').order('nama');
  const bankOpts = ((bankData ?? []) as { id: number; nama: string }[]).map((b) => ({
    value: String(b.id),
    label: b.nama,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<InterviewRow>[] = [
    {
      header: 'Customer',
      render: (r) => <span className="font-medium">{r.customers?.nama_lengkap ?? '-'}</span>,
    },
    { header: 'Unit', render: (r) => r.units?.kode_kavling ?? '-' },
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'Bank KPR', render: (r) => r.bank_kpr?.nama ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && (
            <WawancaraEditButton
              customers={customerOpts}
              banks={bankOpts}
              editId={r.id}
              initial={{
                customerId: r.customer_id,
                tanggal: toDateInput(r.tanggal),
                bankKprId: r.bank_kpr_id,
                catatan: r.catatan,
              }}
            />
          )}
          {canDelete && <WawancaraDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Wawancara"
        subtitle="Jadwal wawancara KPR customer"
        actions={
          canCreate ? <WawancaraCreateButton customers={customerOpts} banks={bankOpts} /> : undefined
        }
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada jadwal wawancara. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
