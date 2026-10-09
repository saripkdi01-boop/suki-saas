import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { PiutangCreateButton, PiutangEditButton, PiutangDeleteButton, PiutangBayarButton, type PiutangRow } from './Buttons';

const MENU = '/admin/keuangan/piutang';
const PER_PAGE = 20;

export default async function PiutangPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin().from('receivables').select('*', { count: 'exact' }).order('tanggal', { ascending: false });
  if (q) query = query.ilike('pihak', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as PiutangRow[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<PiutangRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Pihak', render: (r) => <span className="font-medium">{r.pihak}</span> },
    { header: 'Jumlah', className: 'text-right', render: (r) => rp(r.jumlah) },
    { header: 'Sudah Bayar', className: 'text-right', render: (r) => rp(r.sudah_bayar) },
    {
      header: 'Sisa',
      className: 'text-right',
      render: (r) => <span className="font-semibold">{rp(Number(r.jumlah) - Number(r.sudah_bayar))}</span>,
    },
    {
      header: 'Status',
      render: (r) =>
        r.status === 'lunas' ? (
          <Badge color="#16a34a">Lunas</Badge>
        ) : (
          <Badge color="#f59e0b">Belum Lunas</Badge>
        ),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && r.status !== 'lunas' && <PiutangBayarButton row={r} />}
          {canEdit && <PiutangEditButton row={r} />}
          {canDelete && <PiutangDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Piutang"
        subtitle="Catat piutang perusahaan dan pelunasannya"
        actions={canCreate ? <PiutangCreateButton /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari pihak…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada piutang. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
