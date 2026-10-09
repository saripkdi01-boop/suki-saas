import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { rp, tglWita, cx } from '@/lib/format';
import { PaymentCreateButton, PaymentEditButton, PaymentDeleteButton, JENIS_LABEL, type PaymentRow } from './Buttons';

const MENU = '/admin/pembayaran';
const PER_PAGE = 20;

interface CustPay {
  id: number;
  nama_lengkap: string;
  units: { kode_kavling: string } | null;
  payments: Array<{ tagihan: number | string; sudah_bayar: number | string }>;
}

interface PayRow {
  id: number;
  tanggal: string;
  customer_id: number;
  unit_id: number | null;
  jenis_tagihan: string;
  tagihan: number | string;
  sudah_bayar: number | string;
  metode: string | null;
  rekening_id: number | null;
  keterangan: string | null;
  customers: { nama_lengkap: string } | null;
  units: { kode_kavling: string } | null;
}

export default async function PembayaranPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  // ---------- Card 1: ringkasan per customer (hanya yang punya >= 1 pembayaran) ----------
  const { data: custData } = await db
    .from('customers')
    .select('id, nama_lengkap, units(kode_kavling), payments(tagihan, sudah_bayar)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const summary = ((custData ?? []) as unknown as CustPay[])
    .map((c) => {
      const total_tagihan = c.payments.reduce((s, p) => s + Number(p.tagihan ?? 0), 0);
      const total_bayar = c.payments.reduce((s, p) => s + Number(p.sudah_bayar ?? 0), 0);
      return {
        id: c.id,
        nama: c.nama_lengkap,
        unit: c.units?.kode_kavling ?? '-',
        total_tagihan,
        total_bayar,
        sisa: total_tagihan - total_bayar,
        n: c.payments.length,
      };
    })
    .filter((c) => c.n > 0);

  // ---------- Card 2: entri pembayaran (paginated; q cari di nama customer) ----------
  let customerIds: number[] | null = null;
  if (q) {
    const { data: cs } = await db.from('customers').select('id').ilike('nama_lengkap', `%${q}%`);
    customerIds = ((cs ?? []) as Array<{ id: number }>).map((c) => c.id);
  }
  let rows: PayRow[] = [];
  let total = 0;
  if (!q || (customerIds && customerIds.length > 0)) {
    let query = db
      .from('payments')
      .select('*, customers(nama_lengkap), units(kode_kavling)', { count: 'exact' })
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false });
    if (customerIds) query = query.in('customer_id', customerIds);
    const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
    rows = (data ?? []) as unknown as PayRow[];
    total = count ?? 0;
  }

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  // Options untuk form
  const { data: allCust } = await db
    .from('customers')
    .select('id, nama_lengkap, units(kode_kavling)')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const customerOpts = ((allCust ?? []) as unknown as Array<{ id: number; nama_lengkap: string; units: { kode_kavling: string } | null }>).map(
    (c) => ({
      value: String(c.id),
      label: c.units?.kode_kavling ? `${c.nama_lengkap} (${c.units.kode_kavling})` : c.nama_lengkap,
      unitKode: c.units?.kode_kavling ?? null,
    })
  );
  const { data: reks } = await db.from('bank_transaksi').select('id, nama_bank, no_rekening').order('nama_bank');
  const rekeningOpts = ((reks ?? []) as Array<{ id: number; nama_bank: string; no_rekening: string }>).map((r) => ({
    value: String(r.id),
    label: `${r.nama_bank} — ${r.no_rekening}`,
  }));

  const columns: Column<PayRow>[] = [
    { header: 'Tanggal', render: (r) => <span className="whitespace-nowrap">{tglWita(r.tanggal)}</span> },
    { header: 'Customer', render: (r) => r.customers?.nama_lengkap ?? '-' },
    { header: 'Unit', render: (r) => r.units?.kode_kavling ?? '-' },
    { header: 'Jenis', render: (r) => JENIS_LABEL[r.jenis_tagihan] ?? r.jenis_tagihan },
    { header: 'Tagihan', className: 'text-right', render: (r) => rp(r.tagihan) },
    { header: 'Sudah Bayar', className: 'text-right', render: (r) => rp(r.sudah_bayar) },
    {
      header: 'Sisa',
      className: 'text-right',
      render: (r) => {
        const sisa = Number(r.tagihan ?? 0) - Number(r.sudah_bayar ?? 0);
        return <span className={cx('font-bold', sisa > 0 && 'text-red-600 dark:text-red-400')}>{rp(sisa)}</span>;
      },
    },
    { header: 'Metode', render: (r) => r.metode ?? '-' },
    {
      header: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          {canEdit && <PaymentEditButton row={r as unknown as PaymentRow} />}
          {canDelete && <PaymentDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pembayaran"
        subtitle="Ringkasan tagihan & pembayaran per customer, serta entri pembayaran"
        actions={canCreate ? <PaymentCreateButton customers={customerOpts} rekenings={rekeningOpts} /> : undefined}
      />

      <Card className="mb-5">
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Ringkasan per Customer</h2>
        {summary.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pembayaran tercatat.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Unit</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Total Tagihan</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Sudah Bayar</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Sisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.map((c) => (
                  <tr key={c.id} className="bg-white odd:bg-slate-50/60 dark:bg-slate-900 dark:odd:bg-slate-900/60">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{c.nama}</td>
                    <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{c.unit}</td>
                    <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-200">{rp(c.total_tagihan)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-200">{rp(c.total_bayar)}</td>
                    <td className={cx('px-4 py-2.5 text-right font-bold', c.sisa > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200')}>
                      {rp(c.sisa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Entri Pembayaran</h2>
        <div className="mb-4">
          <SearchBox placeholder="Cari nama customer…" />
        </div>
        <DataTable columns={columns} rows={rows} total={total} perPage={perPage} emptyHint="Belum ada entri pembayaran." />
      </Card>
    </div>
  );
}

