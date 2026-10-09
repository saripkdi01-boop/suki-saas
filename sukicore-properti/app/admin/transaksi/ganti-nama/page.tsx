import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { GantiNamaForm } from './GantiNamaForm';

const MENU = '/admin/transaksi/ganti-nama';
const PER_PAGE = 20;

interface Row {
  id: number;
  tanggal: string;
  nama_baru: string;
  biaya_ganti_nama: number | string | null;
  bukti_url: string | null;
  customer_lama: { nama_lengkap: string } | null;
}

interface CustomerOpt {
  value: string;
  label: string;
  unitKode: string;
}

export default async function GantiNamaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  // Customer aktif yang sudah memiliki unit
  const { data: custData } = await supabaseAdmin()
    .from('customers')
    .select('id, nama_lengkap, unit:units(kode_kavling)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .not('unit_id', 'is', null)
    .order('nama_lengkap');
  const customers: CustomerOpt[] = ((custData ?? []) as unknown as {
    id: number;
    nama_lengkap: string;
    unit: { kode_kavling: string } | null;
  }[]).map((c) => ({
    value: String(c.id),
    label: `${c.nama_lengkap} — ${c.unit?.kode_kavling ?? '-'}`,
    unitKode: c.unit?.kode_kavling ?? '-',
  }));

  // Riwayat ganti nama
  let query = supabaseAdmin()
    .from('name_changes')
    .select('*, customer_lama:customers!name_changes_customer_lama_id_fkey!inner(nama_lengkap)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customer_lama.nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;

  const columns: Column<Row>[] = [
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'Customer Lama', render: (r) => <span className="font-medium">{r.customer_lama?.nama_lengkap ?? '-'}</span> },
    { header: 'Nama Baru', render: (r) => <span className="font-semibold">{r.nama_baru}</span> },
    { header: 'Biaya', render: (r) => rp(r.biaya_ganti_nama) },
    {
      header: 'Bukti',
      render: (r) =>
        r.bukti_url ? (
          <a href={r.bukti_url} target="_blank" rel="noreferrer" className="text-emerald-700 underline dark:text-emerald-400">
            Lihat
          </a>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Ganti Nama" subtitle="Alihkan kepemilikan unit ke nama baru" />
      {canCreate && (
        <Card className="mb-6">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Form Ganti Nama</h2>
          <GantiNamaForm customers={customers} />
        </Card>
      )}
      <Card>
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Riwayat Ganti Nama</h2>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer lama…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada riwayat ganti nama." />
      </Card>
    </div>
  );
}
