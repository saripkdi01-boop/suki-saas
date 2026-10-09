import Link from 'next/link';
import { requirePerm } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card, Stat, StatusBadge } from '@/components/ui';
import { rp } from '@/lib/format';
import { DashboardCharts } from '@/components/dashboard/Charts';

const MENU = '/admin/dashboard';

interface StatusRow {
  id: number;
  nama: string;
  warna_hex: string | null;
  urutan: number;
}
interface LocRow {
  id: number;
  nama: string;
}
interface UnitRow {
  id: number;
  location_id: number;
  status_id: number | null;
  is_ready: boolean;
}

function witaDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export default async function DashboardPage() {
  await requirePerm(MENU, 'view');
  const db = supabaseAdmin();
  const today = witaDate();
  const monthStart = today.slice(0, 8) + '01';
  const [yy, mm] = monthStart.split('-').map(Number);
  const nextMonthStart = new Date(Date.UTC(yy, mm, 1)).toISOString().slice(0, 10);

  const [
    { data: statusesRaw },
    { data: locationsRaw },
    { data: unitsRaw },
    { data: interviewsRaw },
    { data: approvalsRaw },
    { data: banksRaw },
    { data: customersRaw },
    { data: marketingRaw },
    { data: adminRaw },
    { count: wawancaraCount },
    { count: akadCount },
  ] = await Promise.all([
    db.from('unit_statuses').select('id, nama, warna_hex, urutan').order('urutan'),
    db.from('locations').select('id, nama').order('nama'),
    db.from('units').select('id, location_id, status_id, is_ready').is('deleted_at', null),
    db.from('interviews').select('customer_id, bank_kpr_id').not('bank_kpr_id', 'is', null),
    db.from('bank_approvals').select('customer_id, plafon_acc'),
    db.from('bank_kpr').select('id, nama').order('nama'),
    db
      .from('customers')
      .select('id, marketing_id, admin_id, status_id')
      .eq('is_archived', false)
      .is('deleted_at', null),
    db.from('marketing').select('id, nama').eq('is_active', true).order('nama'),
    db.from('admin_staff').select('id, nama').eq('is_active', true).order('nama'),
    db.from('interviews').select('id', { count: 'exact', head: true }).gte('tanggal', today),
    db
      .from('akad_schedules')
      .select('id', { count: 'exact', head: true })
      .gte('tanggal', monthStart)
      .lt('tanggal', nextMonthStart),
  ]);

  const statuses = (statusesRaw ?? []) as StatusRow[];
  const locations = (locationsRaw ?? []) as LocRow[];
  const units = (unitsRaw ?? []) as UnitRow[];
  const statusName = new Map(statuses.map((s) => [s.id, s.nama]));
  const cancelId = statuses.find((s) => s.nama === 'User Cancel')?.id ?? -1;

  const countByStatus = new Map<number, number>();
  for (const u of units) {
    if (u.status_id !== null) countByStatus.set(u.status_id, (countByStatus.get(u.status_id) ?? 0) + 1);
  }
  const countByName = (nama: string) => {
    const s = statuses.find((x) => x.nama === nama);
    return s ? countByStatus.get(s.id) ?? 0 : 0;
  };

  const totalUnits = units.length;
  const readyCount = units.filter((u) => u.is_ready).length;

  // Statistik per lokasi
  const locStats = locations.map((loc) => {
    const lu = units.filter((u) => u.location_id === loc.id);
    const byName = (nama: string) => {
      const s = statuses.find((x) => x.nama === nama);
      return s ? lu.filter((u) => u.status_id === s.id).length : 0;
    };
    return {
      id: loc.id,
      nama: loc.nama,
      total: lu.length,
      ready: lu.filter((u) => u.is_ready).length,
      bookingFee: byName('Booking Fee'),
      onProses: byName('On Proses Bank'),
      sp3k: byName('SP3K'),
      akad: byName('Akad'),
    };
  });

  // Penggunaan bank KPR: wawancara + ACC + plafon per bank
  const interviews = (interviewsRaw ?? []) as { customer_id: number; bank_kpr_id: number }[];
  const approvals = (approvalsRaw ?? []) as { customer_id: number; plafon_acc: number | null }[];
  const banks = (banksRaw ?? []) as { id: number; nama: string }[];
  const customerBank = new Map<number, number>();
  const wawancaraByBank = new Map<number, number>();
  for (const w of interviews) {
    customerBank.set(w.customer_id, w.bank_kpr_id);
    wawancaraByBank.set(w.bank_kpr_id, (wawancaraByBank.get(w.bank_kpr_id) ?? 0) + 1);
  }
  const bankStats = banks.map((b) => {
    const rel = approvals.filter((a) => customerBank.get(a.customer_id) === b.id);
    return {
      id: b.id,
      nama: b.nama,
      wawancara: wawancaraByBank.get(b.id) ?? 0,
      acc: rel.length,
      plafon: rel.reduce((s, a) => s + (Number(a.plafon_acc) || 0), 0),
    };
  });

  // Penjualan per marketing & per admin (customer aktif, bukan User Cancel)
  const customers = (customersRaw ?? []) as {
    id: number;
    marketing_id: number | null;
    admin_id: number | null;
    status_id: number | null;
  }[];
  const active = customers.filter((c) => c.status_id !== cancelId);
  const marketingList = (marketingRaw ?? []) as { id: number; nama: string }[];
  const adminList = (adminRaw ?? []) as { id: number; nama: string }[];
  const salesByMarketing = marketingList
    .map((m) => ({ nama: m.nama, jumlah: active.filter((c) => c.marketing_id === m.id).length }))
    .sort((a, b) => b.jumlah - a.jumlah);
  const salesByAdmin = adminList
    .map((a) => ({ nama: a.nama, jumlah: active.filter((c) => c.admin_id === a.id).length }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Ringkasan penjualan dan unit" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Unit" value={totalUnits.toLocaleString('id-ID')} />
        <Stat label="Booking Fee Aktif" value={countByName('Booking Fee').toLocaleString('id-ID')} />
        <Stat label="Wawancara Terjadwal" value={(wawancaraCount ?? 0).toLocaleString('id-ID')} sub="mulai hari ini" />
        <Stat label="Akad Bulan Ini" value={(akadCount ?? 0).toLocaleString('id-ID')} />
      </div>

      <Card className="mt-5">
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Penjualan per Lokasi</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                <th className="py-2 pr-4 font-medium">Lokasi</th>
                <th className="py-2 pr-4 text-right font-medium">Total</th>
                <th className="py-2 pr-4 text-right font-medium">Ready</th>
                <th className="py-2 pr-4 text-right font-medium">Booking Fee</th>
                <th className="py-2 pr-4 text-right font-medium">On Proses Bank</th>
                <th className="py-2 pr-4 text-right font-medium">SP3K</th>
                <th className="py-2 pr-4 text-right font-medium">Akad</th>
                <th className="py-2 text-right font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {locStats.map((l) => (
                <tr key={l.id} className="text-slate-800 dark:text-slate-200">
                  <td className="py-2.5 pr-4 font-medium">{l.nama}</td>
                  <td className="py-2.5 pr-4 text-right">{l.total.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 pr-4 text-right">{l.ready.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 pr-4 text-right">{l.bookingFee.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 pr-4 text-right">{l.onProses.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 pr-4 text-right">{l.sp3k.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 pr-4 text-right">{l.akad.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/admin/dashboard/lokasi-penjualan/${l.id}`}
                      className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <DashboardCharts
          statusData={statuses.map((s) => ({
            nama: s.nama,
            jumlah: countByStatus.get(s.id) ?? 0,
            warna: s.warna_hex,
          }))}
          readyData={[
            { nama: 'Ready', jumlah: readyCount },
            { nama: 'Belum Ready', jumlah: totalUnits - readyCount },
          ]}
        />
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Penjualan per Marketing</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                <th className="py-2 pr-4 font-medium">Marketing</th>
                <th className="py-2 text-right font-medium">Customer Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {salesByMarketing.map((m, i) => (
                <tr key={i} className="text-slate-800 dark:text-slate-200">
                  <td className="py-2.5 pr-4">{m.nama}</td>
                  <td className="py-2.5 text-right font-medium">{m.jumlah.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {salesByMarketing.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-slate-500">
                    Belum ada data marketing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Penjualan per Admin Pemberkasan</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                <th className="py-2 pr-4 font-medium">Admin</th>
                <th className="py-2 text-right font-medium">Customer Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {salesByAdmin.map((a, i) => (
                <tr key={i} className="text-slate-800 dark:text-slate-200">
                  <td className="py-2.5 pr-4">{a.nama}</td>
                  <td className="py-2.5 text-right font-medium">{a.jumlah.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {salesByAdmin.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-slate-500">
                    Belum ada data admin pemberkasan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Penggunaan Bank KPR</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                <th className="py-2 pr-4 font-medium">Bank</th>
                <th className="py-2 pr-4 text-right font-medium">Wawancara</th>
                <th className="py-2 pr-4 text-right font-medium">ACC Bank</th>
                <th className="py-2 text-right font-medium">Total Plafon ACC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bankStats.map((b) => (
                <tr key={b.id} className="text-slate-800 dark:text-slate-200">
                  <td className="py-2.5 pr-4 font-medium">{b.nama}</td>
                  <td className="py-2.5 pr-4 text-right">{b.wawancara.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 pr-4 text-right">{b.acc.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 text-right">{rp(b.plafon)}</td>
                </tr>
              ))}
              {bankStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    Belum ada data bank KPR.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Legenda Status</h2>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <StatusBadge key={s.id} nama={`${s.nama} (${(countByStatus.get(s.id) ?? 0).toLocaleString('id-ID')})`} warna={s.warna_hex} />
          ))}
        </div>
      </Card>
    </div>
  );
}
