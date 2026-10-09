import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita, rp } from '@/lib/format';
import { BalikNamaCreateButton, BalikNamaEditButton, BalikNamaDeleteButton } from './Buttons';

const MENU = '/admin/legal/balik-nama';
const PER_PAGE = 20;

const STATUS_WARNA: Record<string, string> = { belum: '#64748b', proses: '#d97706', selesai: '#059669' };
const STATUS_LABEL: Record<string, string> = { belum: 'Belum', proses: 'Proses', selesai: 'Selesai' };

interface Row {
  id: number;
  customer_id: number;
  unit_id: number | null;
  status: string;
  tanggal: string | null;
  nominal: number | string | null;
  notaris_id: number | null;
  keterangan: string | null;
  customers: { nama_lengkap: string } | null;
  units: { kode_kavling: string } | null;
  notaries: { nama: string } | null;
}

export default async function BalikNamaPage({
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

  const { data: notList } = await supabaseAdmin().from('notaries').select('id, nama').order('nama');
  const notarisOptions = ((notList ?? []) as { id: number; nama: string }[]).map((n) => ({
    value: String(n.id),
    label: n.nama,
  }));

  let query = supabaseAdmin()
    .from('balik_nama')
    .select('*, customers!inner(nama_lengkap), units(kode_kavling), notaries(nama)', { count: 'exact' })
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
    { header: 'Notaris', render: (r) => r.notaries?.nama ?? '-' },
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
          {canEdit && <BalikNamaEditButton row={r} customers={customerOptions} units={unitOptions} notaris={notarisOptions} />}
          {canDelete && <BalikNamaDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Balik Nama"
        subtitle="Kelola proses balik nama sertifikat per customer"
        actions={canCreate ? <BalikNamaCreateButton customers={customerOptions} units={unitOptions} notaris={notarisOptions} /> : undefined}
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
          emptyHint="Belum ada data balik nama. Tambahkan via tombol di atas."
        />
      </Card>
    </div>
  );
}
