import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { HandoverCreateButton, HandoverDeleteButton } from './Buttons';

const MENU = '/admin/customer/serah-terima-kunci';
const PER_PAGE = 20;

interface Row {
  id: number;
  customer_id: number;
  unit_id: number | null;
  tanggal: string;
  catatan: string | null;
  bukti_url: string | null;
  customers: { nama_lengkap: string } | null;
  units: { kode_kavling: string } | null;
}

interface AkadRow {
  id: number;
  nama_lengkap: string;
  unit_statuses: { nama: string } | null;
}

export default async function SerahTerimaPage({
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
    .from('handovers')
    .select('id, customer_id, unit_id, tanggal, catatan, bukti_url, customers(nama_lengkap), units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.or(`catatan.ilike.%${q}%,customers.nama_lengkap.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  // Customer berstatus 'Akad' (non-arsip) — opsi untuk form serah terima.
  const { data: akad } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_statuses!inner(nama)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const akadOpts = ((akad ?? []) as unknown as AkadRow[])
    .filter((c) => c.unit_statuses?.nama === 'Akad')
    .map((c) => ({ value: String(c.id), label: c.nama_lengkap }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customers?.nama_lengkap ?? '-'}</span> },
    { header: 'Unit', render: (r) => r.units?.kode_kavling ?? '-' },
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'Catatan', render: (r) => r.catatan ?? '-' },
    {
      header: 'Bukti',
      render: (r) =>
        r.bukti_url ? (
          <a href={r.bukti_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
            Lihat
          </a>
        ) : (
          '-'
        ),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canDelete && <HandoverDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Serah Terima Kunci"
        subtitle="Pencatatan serah terima unit ke customer"
        actions={canCreate ? <HandoverCreateButton customers={akadOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer / catatan…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={count ?? 0}
          perPage={perPage}
          emptyHint="Belum ada serah terima kunci."
        />
      </Card>
    </div>
  );
}
