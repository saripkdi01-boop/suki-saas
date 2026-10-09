import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita } from '@/lib/format';
import { PindahUnitForm } from './PindahUnitForm';

const MENU = '/admin/transaksi/pindah-unit';
const PER_PAGE = 20;

interface Row {
  id: number;
  tanggal: string;
  biaya_admin: number | string | null;
  metode_bayar: string | null;
  bukti_url: string | null;
  customer: { nama_lengkap: string } | null;
  unit_lama: { kode_kavling: string } | null;
  unit_baru: { kode_kavling: string } | null;
}

interface CustomerOpt {
  value: string;
  label: string;
  unitId: number;
  unitKode: string;
}

interface Opt {
  value: string;
  label: string;
}

export default async function PindahUnitPage({
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
    .select('id, nama_lengkap, unit_id, unit:units(kode_kavling)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .not('unit_id', 'is', null)
    .order('nama_lengkap');
  const customers: CustomerOpt[] = ((custData ?? []) as unknown as {
    id: number;
    nama_lengkap: string;
    unit_id: number;
    unit: { kode_kavling: string } | null;
  }[]).map((c) => ({
    value: String(c.id),
    label: `${c.nama_lengkap} — ${c.unit?.kode_kavling ?? '-'}`,
    unitId: c.unit_id,
    unitKode: c.unit?.kode_kavling ?? '-',
  }));

  // Unit berstatus Ready
  const { data: unitData } = await supabaseAdmin()
    .from('units')
    .select('id, kode_kavling, unit_statuses!inner(nama)')
    .eq('unit_statuses.nama', 'Ready')
    .order('kode_kavling');
  const readyUnits: Opt[] = ((unitData ?? []) as unknown as { id: number; kode_kavling: string }[]).map((u) => ({
    value: String(u.id),
    label: u.kode_kavling,
  }));

  // Rekening perusahaan
  const { data: rekData } = await supabaseAdmin().from('bank_transaksi').select('id, nama_bank, no_rekening').order('nama_bank');
  const rekenings: Opt[] = ((rekData ?? []) as unknown as { id: number; nama_bank: string; no_rekening: string }[]).map((r) => ({
    value: String(r.id),
    label: `${r.nama_bank} — ${r.no_rekening}`,
  }));

  // Riwayat pindah unit
  let query = supabaseAdmin()
    .from('unit_transfers')
    .select(
      '*, customer:customers!inner(nama_lengkap), unit_lama:units!unit_transfers_unit_lama_id_fkey(kode_kavling), unit_baru:units!unit_transfers_unit_baru_id_fkey(kode_kavling)',
      { count: 'exact' }
    )
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customer.nama_lengkap', `%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const canCreate = me ? await can(me, MENU, 'create') : false;

  const columns: Column<Row>[] = [
    { header: 'Tanggal', render: (r) => tglWita(r.tanggal) },
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer?.nama_lengkap ?? '-'}</span> },
    { header: 'Unit Lama', render: (r) => <span className="line-through text-slate-500">{r.unit_lama?.kode_kavling ?? '-'}</span> },
    { header: 'Unit Baru', render: (r) => <span className="font-semibold">{r.unit_baru?.kode_kavling ?? '-'}</span> },
    { header: 'Biaya Admin', render: (r) => rp(r.biaya_admin) },
    { header: 'Metode', render: (r) => r.metode_bayar ?? '-' },
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
      <PageHeader title="Pindah Unit" subtitle="Pindahkan customer ke kavling/unit lain" />
      {canCreate && (
        <Card className="mb-6">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Form Pindah Unit</h2>
          <PindahUnitForm customers={customers} readyUnits={readyUnits} rekenings={rekenings} />
        </Card>
      )}
      <Card>
        <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Riwayat Pindah Unit</h2>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada riwayat pindah unit." />
      </Card>
    </div>
  );
}
