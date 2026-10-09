import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { PenerimaanCreateButton, PenerimaanDeleteButton, type POOption } from './Buttons';

const MENU = '/admin/pembelian/barang-masuk';
const PER_PAGE = 20;

interface ReceiptRow {
  id: number;
  tanggal: string;
  po_id: number | null;
  items: Array<{ kode: string; nama: string; qty: number; satuan: string }>;
  keterangan: string | null;
  purchase_orders: { no_po: string } | null;
}

export default async function BarangMasukPage({
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
    .from('goods_receipts')
    .select('*, purchase_orders(no_po)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('keterangan', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as ReceiptRow[];

  const { data: poData } = await db
    .from('purchase_orders')
    .select('id, no_po, tanggal, items, suppliers(nama)')
    .in('status', ['draft', 'dipesan'])
    .order('tanggal', { ascending: false })
    .limit(200);
  type RawPO = { id: number; no_po: string; tanggal: string; items: POOption['items'] | null; suppliers: { nama: string } | { nama: string }[] | null };
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const pos: POOption[] = ((poData ?? []) as RawPO[]).map((p) => ({
    id: p.id,
    no_po: p.no_po,
    tanggal: p.tanggal,
    supplier_nama: one(p.suppliers)?.nama ?? null,
    items: (p.items ?? []).map((it) => ({ ...it, satuan: it.satuan ?? '' })),
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<ReceiptRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'No. PO', render: (r) => <span className="font-medium">{r.purchase_orders?.no_po ?? '-'}</span> },
    {
      header: 'Item',
      render: (r) => (
        <span title={(r.items ?? []).map((it) => `${it.kode} ×${it.qty}`).join(', ')}>
          {(r.items ?? []).length} item
        </span>
      ),
    },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canDelete && <PenerimaanDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Barang Masuk"
        subtitle="Penerimaan barang dari PO — otomatis menambah stok gudang"
        actions={canCreate ? <PenerimaanCreateButton pos={pos} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari keterangan…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada penerimaan barang." />
      </Card>
    </div>
  );
}
