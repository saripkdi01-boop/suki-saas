import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { AduanCreateButton, AduanEditButton, AduanDeleteButton } from './Buttons';

const MENU = '/admin/customer/aduan-customer';
const PER_PAGE = 20;

const STATUS_WARNA: Record<string, string> = {
  terbuka: '#d97706',
  diproses: '#2563eb',
  selesai: '#059669',
};

interface Row {
  id: number;
  customer_id: number;
  judul: string;
  isi: string | null;
  status: string;
  created_at: string;
  customers: { nama_lengkap: string } | null;
}

export default async function AduanCustomerPage({
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
    .from('customer_complaints')
    .select('id, customer_id, judul, isi, status, created_at, customers(nama_lengkap)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) query = query.or(`judul.ilike.%${q}%,isi.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const { data: customers } = await db
    .from('customers')
    .select('id, nama_lengkap')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const custOpts = ((customers ?? []) as { id: number; nama_lengkap: string }[]).map((c) => ({
    value: String(c.id),
    label: c.nama_lengkap,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Judul', render: (r) => <span className="font-medium">{r.judul}</span> },
    { header: 'Customer', render: (r) => r.customers?.nama_lengkap ?? '-' },
    {
      header: 'Status',
      render: (r) => <Badge color={STATUS_WARNA[r.status] ?? undefined}>{labelStatus(r.status)}</Badge>,
    },
    { header: 'Tanggal', render: (r) => tglWita(r.created_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <AduanEditButton row={r} custOpts={custOpts} />}
          {canDelete && <AduanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Aduan Customer"
        subtitle="Kelola aduan / keluhan customer"
        actions={canCreate ? <AduanCreateButton custOpts={custOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari judul / isi aduan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada aduan customer." />
      </Card>
    </div>
  );
}

function labelStatus(s: string): string {
  switch (s) {
    case 'terbuka':
      return 'Terbuka';
    case 'diproses':
      return 'Diproses';
    case 'selesai':
      return 'Selesai';
    default:
      return s;
  }
}
