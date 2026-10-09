import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { POForm, PODeleteButton, STATUS_LABEL, type SupplierOpt, type BarangOpt, type POItemInput, type POEditData } from './POForm';

const MENU = '/admin/pembelian/input-po';
const PER_PAGE = 20;

interface PORow {
  id: number;
  no_po: string;
  tanggal: string;
  supplier_id: number | null;
  total: number | string;
  status: string;
  keterangan: string | null;
  items: POItemInput[];
  suppliers: { nama: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#64748b',
  dipesan: '#2563eb',
  diterima: '#16a34a',
  batal: '#dc2626',
};

export default async function InputPOPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let query = db
    .from('purchase_orders')
    .select('*, suppliers(nama)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('no_po', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as PORow[];

  const [{ data: sups }, { data: brgs }] = await Promise.all([
    db.from('suppliers').select('id, nama').order('nama'),
    db.from('items').select('id, kode, nama, stok, harga_beli, units_of_measure(nama)').order('kode'),
  ]);
  const suppliers: SupplierOpt[] = (sups ?? []).map((s: { id: number; nama: string }) => ({ id: s.id, nama: s.nama }));
  type RawBrg = { id: number; kode: string; nama: string; stok: number | string; harga_beli: number | string | null; units_of_measure: { nama: string } | { nama: string }[] | null };
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const barangs: BarangOpt[] = ((brgs ?? []) as RawBrg[]).map((b) => ({
    id: b.id,
    kode: b.kode,
    nama: b.nama,
    satuan: one(b.units_of_measure)?.nama ?? null,
    stok: Number(b.stok),
    harga_beli: b.harga_beli,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<PORow>[] = [
    { header: 'No. PO', render: (r) => <span className="font-medium">{r.no_po}</span> },
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Supplier', render: (r) => r.suppliers?.nama ?? '-' },
    { header: 'Item', render: (r) => `${(r.items ?? []).length} item` },
    { header: 'Total', className: 'text-right', render: (r) => <span className="font-semibold">{rp(r.total)}</span> },
    { header: 'Status', render: (r) => <Badge color={STATUS_COLOR[r.status] ?? '#64748b'}>{STATUS_LABEL[r.status] ?? r.status}</Badge> },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => {
        const isDraft = r.status === 'draft';
        const editData: POEditData = {
          id: r.id,
          no_po: r.no_po,
          tanggal: r.tanggal,
          supplier_id: r.supplier_id,
          keterangan: r.keterangan,
          items: (r.items ?? []).map((it) => ({
            barang_id: it.barang_id,
            kode: it.kode,
            nama: it.nama,
            qty: it.qty,
            satuan: it.satuan ?? '',
            harga: it.harga,
          })),
        };
        return (
          <div className="flex justify-end gap-2">
            {canEdit && isDraft && <POForm suppliers={suppliers} barangs={barangs} po={editData} triggerLabel="Edit" />}
            {canDelete && isDraft && <PODeleteButton id={r.id} />}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Input PO"
        subtitle="Purchase Order pengadaan barang — hanya PO draft yang bisa diubah/dihapus"
        actions={canCreate ? <POForm suppliers={suppliers} barangs={barangs} triggerLabel="Buat PO" /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari no. PO…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada PO. Buat via tombol di atas." />
      </Card>
    </div>
  );
}
