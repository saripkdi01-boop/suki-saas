import Link from 'next/link';
import { requirePerm } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, StatusBadge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp } from '@/lib/format';
import { StatusFilter } from './Filters';

const MENU = '/admin/dashboard';
const PER_PAGE = 20;

interface Row {
  id: number;
  kode_kavling: string;
  luas_tanah: number | null;
  luas_bangunan: number | null;
  harga_jual: number | null;
  is_ready: boolean;
  unit_statuses: { nama: string; warna_hex: string | null } | null;
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function LokasiPenjualanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const { id } = await params;
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const statusId = str(sp.status_id).trim();
  const db = supabaseAdmin();

  const { data: loc } = await db.from('locations').select('id, nama').eq('id', id).maybeSingle();
  const namaLokasi = (loc as { nama: string } | null)?.nama ?? 'Lokasi';

  let query = db
    .from('units')
    .select(
      'id, kode_kavling, luas_tanah, luas_bangunan, harga_jual, is_ready, unit_statuses(nama, warna_hex)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .eq('location_id', id)
    .order('kode_kavling');
  if (q) query = query.ilike('kode_kavling', `%${q}%`);
  if (statusId) query = query.eq('status_id', statusId);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const { data: stats } = await db.from('unit_statuses').select('id, nama').order('urutan');
  const statOpts = ((stats ?? []) as { id: number; nama: string }[]).map((s) => ({
    value: String(s.id),
    label: s.nama,
  }));

  const columns: Column<Row>[] = [
    { header: 'Kode', render: (r) => <span className="font-medium">{r.kode_kavling}</span> },
    {
      header: 'Luas T / B (m²)',
      render: (r) => `${r.luas_tanah ?? '-'} / ${r.luas_bangunan ?? '-'}`,
    },
    { header: 'Harga', render: (r) => rp(r.harga_jual) },
    {
      header: 'Status',
      render: (r) =>
        r.unit_statuses ? <StatusBadge nama={r.unit_statuses.nama} warna={r.unit_statuses.warna_hex} /> : '-',
    },
    { header: 'Ready', render: (r) => (r.is_ready ? 'Ya' : 'Tidak') },
  ];

  return (
    <div>
      <PageHeader
        title={namaLokasi}
        subtitle={`Daftar unit — ${(count ?? 0).toLocaleString('id-ID')} unit`}
        actions={
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
          >
            ← Kembali
          </Link>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <SearchBox placeholder="Cari kode kavling…" />
          <StatusFilter statuses={statOpts} />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada unit di lokasi ini." />
      </Card>
    </div>
  );
}
