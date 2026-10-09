import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { RekeningCreateButton, RekeningEditButton, RekeningDeleteButton } from './Buttons';

const MENU = '/admin/master/bank-transaksi';
const PER_PAGE = 20;

interface Row {
  id: number;
  nama_bank: string;
  no_rekening: string;
  atas_nama: string | null;
}

export default async function BankTransaksiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('bank_transaksi').select('*', { count: 'exact' }).order('nama_bank');
  if (q) query = query.or(`nama_bank.ilike.%${q}%,no_rekening.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Nama Bank', render: (r) => <span className="font-medium">{r.nama_bank}</span> },
    { header: 'No. Rekening', render: (r) => r.no_rekening },
    { header: 'Atas Nama', render: (r) => r.atas_nama ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <RekeningEditButton row={r} />}
          {canDelete && <RekeningDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bank Transaksi"
        subtitle="Master rekening bank perusahaan"
        actions={canCreate ? <RekeningCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari bank / no. rekening…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada rekening. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
