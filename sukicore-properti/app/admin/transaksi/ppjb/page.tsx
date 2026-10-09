import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { PpjbCreateButton, PpjbEditButton, PpjbDeleteButton } from './Buttons';

const MENU = '/admin/transaksi/ppjb';
const PER_PAGE = 20;

interface Row {
  id: number;
  tanggal: string;
  no_ppjb: string;
  nominal: number | string | null;
  keterangan: string | null;
  customer_id: number;
  customer: { nama_lengkap: string } | null;
  unit: { kode_kavling: string } | null;
}

interface Opt {
  value: string;
  label: string;
}

export default async function PpjbPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  // Customer aktif yang unitnya berstatus Ready (opsi untuk form)
  const { data: custData } = await supabaseAdmin()
    .from('customers')
    .select('id, nama_lengkap, unit:units!inner(kode_kavling, unit_statuses!inner(nama))')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .not('unit_id', 'is', null)
    .eq('unit.unit_statuses.nama', 'Ready')
    .order('nama_lengkap');
  const customers: Opt[] = ((custData ?? []) as unknown as {
    id: number;
    nama_lengkap: string;
    unit: { kode_kavling: string } | null;
  }[]).map((c) => ({
    value: String(c.id),
    label: `${c.nama_lengkap} — ${c.unit?.kode_kavling ?? '-'}`,
  }));

  // Daftar PPJB
  let query = supabaseAdmin()
    .from('ppjb')
    .select('*, customer:customers!inner(nama_lengkap), unit:units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.or(`no_ppjb.ilike.%${q}%,customer.nama_lengkap.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'No. PPJB', render: (r) => <span className="font-bold">{r.no_ppjb}</span> },
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer?.nama_lengkap ?? '-'}</span> },
    { header: 'Unit', render: (r) => r.unit?.kode_kavling ?? '-' },
    { header: 'Nominal', render: (r) => rp(r.nominal) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <PpjbEditButton row={r} customers={customers} />}
          {canDelete && <PpjbDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="PPJB"
        subtitle="Perjanjian Pengikatan Jual Beli — pembelian cash"
        actions={canCreate ? <PpjbCreateButton customers={customers} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari no. PPJB / customer…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada data PPJB." />
      </Card>
    </div>
  );
}
