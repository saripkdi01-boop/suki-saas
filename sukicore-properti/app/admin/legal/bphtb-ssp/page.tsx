import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita, rp } from '@/lib/format';
import { BphtbSspCreateButton, BphtbSspEditButton, BphtbSspDeleteButton } from './Buttons';

const MENU = '/admin/legal/bphtb-ssp';
const PER_PAGE = 20;

const STATUS_WARNA: Record<string, string> = { belum: '#64748b', proses: '#d97706', selesai: '#059669' };
const STATUS_LABEL: Record<string, string> = { belum: 'Belum', proses: 'Proses', selesai: 'Selesai' };
const JENIS_WARNA: Record<string, string> = { bphtb: '#2563eb', ssp: '#7c3aed' };
const JENIS_LABEL: Record<string, string> = { bphtb: 'BPHTB', ssp: 'SSP' };

interface Row {
  id: number;
  customer_id: number;
  unit_id: number | null;
  jenis: string;
  status: string;
  tanggal: string | null;
  nominal: number | string | null;
  keterangan: string | null;
  customers: { nama_lengkap: string } | null;
  units: { kode_kavling: string } | null;
}

export default async function BphtbSspPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  const { data: custList } = await supabaseAdmin().from('customers').select('id, nama_lengkap').order('nama_lengkap').limit(2000);
  const customerOptions = ((custList ?? []) as { id: number; nama_lengkap: string }[]).map((c) => ({
    value: String(c.id),
    label: c.nama_lengkap,
  }));

  const { data: unitList } = await supabaseAdmin().from('units').select('id, kode_kavling, locations(nama)').order('kode_kavling').limit(2000);
  const unitOptions = ((unitList ?? []) as unknown as { id: number; kode_kavling: string; locations: { nama: string } | null }[]).map(
    (u) => ({ value: String(u.id), label: `${u.kode_kavling} — ${u.locations?.nama ?? '-'}` })
  );

  let query = supabaseAdmin()
    .from('bphtb_ssp')
    .select('*, customers!inner(nama_lengkap), units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customers.nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customers?.nama_lengkap ?? '-'}</span> },
    { header: 'Unit', render: (r) => r.units?.kode_kavling ?? '-' },
    {
      header: 'Jenis',
      render: (r) => <Badge color={JENIS_WARNA[r.jenis] ?? '#64748b'}>{JENIS_LABEL[r.jenis] ?? r.jenis}</Badge>,
    },
    {
      header: 'Status',
      render: (r) => <Badge color={STATUS_WARNA[r.status] ?? '#64748b'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>,
    },
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'Nominal', render: (r) => rp(r.nominal), className: 'text-right' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <BphtbSspEditButton row={r} customers={customerOptions} units={unitOptions} />}
          {canDelete && <BphtbSspDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="BPHTB & SSP"
        subtitle="Kelola pembayaran BPHTB dan SSP per customer"
        actions={canCreate ? <BphtbSspCreateButton customers={customerOptions} units={unitOptions} /> : undefined}
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
          emptyHint="Belum ada data BPHTB/SSP. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
