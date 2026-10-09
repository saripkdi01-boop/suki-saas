import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { CancelCreateButton, CancelDeleteButton } from './Buttons';

const MENU = '/admin/transaksi/pembelian-cancel';
const PER_PAGE = 20;

interface Row {
  id: number;
  tanggal: string;
  alasan: string | null;
  customer: { nama_lengkap: string } | null;
  unit: { kode_kavling: string } | null;
}

interface Opt {
  value: string;
  label: string;
}

export default async function PembelianCancelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  // Customer aktif yang memiliki unit (opsi untuk form)
  const { data: custData } = await supabaseAdmin()
    .from('customers')
    .select('id, nama_lengkap, unit:units(kode_kavling)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .not('unit_id', 'is', null)
    .order('nama_lengkap');
  const customers: Opt[] = ((custData ?? []) as unknown as {
    id: number;
    nama_lengkap: string;
    unit: { kode_kavling: string } | null;
  }[]).map((c) => ({
    value: String(c.id),
    label: `${c.nama_lengkap} — ${c.unit?.kode_kavling ?? '-'}`,
  }));

  // Riwayat pembatalan
  let query = supabaseAdmin()
    .from('cancellations')
    .select('*, customer:customers!inner(nama_lengkap), unit:units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customer.nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer?.nama_lengkap ?? '-'}</span> },
    { header: 'Unit', render: (r) => r.unit?.kode_kavling ?? '-' },
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'Alasan', render: (r) => r.alasan ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => <div className="flex justify-end gap-2">{canDelete && <CancelDeleteButton id={r.id} />}</div>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pembelian Cancel"
        subtitle="Batalkan pembelian customer dan kembalikan kavling ke stok"
        actions={canCreate ? <CancelCreateButton customers={customers} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada pembatalan." />
      </Card>
    </div>
  );
}
