import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard, Map, ArrowLeftRight, Wallet, Users, Building2, TrendingUp, BookOpen,
} from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { PageHeader, Card } from '@/components/ui';

const QUICK = [
  { path: '/admin/dashboard', nama: 'Dashboard', desc: 'Statistik penjualan & unit', icon: LayoutDashboard },
  { path: '/admin/siteplan/penjualan', nama: 'Siteplan', desc: 'Denah interaktif per lokasi', icon: Map },
  { path: '/admin/transaksi/wawancara', nama: 'Transaksi', desc: 'Pipeline KPR & cash', icon: ArrowLeftRight },
  { path: '/admin/pembayaran', nama: 'Pembayaran', desc: 'Tagihan & pelunasan customer', icon: Wallet },
  { path: '/admin/customer/customer', nama: 'Customer', desc: 'Data nasabah & prospek', icon: Users },
  { path: '/admin/master/kavling', nama: 'Kavling', desc: 'Master data unit', icon: Building2 },
  { path: '/admin/keuangan/laporan-arus-kas', nama: 'Keuangan', desc: 'Arus kas & laporan', icon: TrendingUp },
  { path: '/admin/panduan-aplikasi', nama: 'Panduan', desc: 'Panduan per peran', icon: BookOpen },
];

export default async function BerandaPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const sp = await searchParams;

  const items = [];
  for (const q of QUICK) {
    if (await can(user, q.path, 'view')) items.push(q);
  }

  return (
    <div>
      <PageHeader title={`Halo, ${user.nama_lengkap}`} subtitle={`Masuk sebagai ${user.username} (${user.role})`} />
      {sp.denied && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Anda tidak memiliki izin untuk membuka halaman tersebut.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((q) => (
          <Link key={q.path} href={q.path}>
            <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
              <q.icon size={28} className="text-emerald-600 dark:text-emerald-400" />
              <div className="mt-3 font-semibold text-slate-900 dark:text-white">{q.nama}</div>
              <div className="mt-1 text-sm text-slate-500">{q.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
      {items.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Role Anda belum diberi akses ke modul mana pun. Hubungi SUPERADMIN.</p>
        </Card>
      )}
    </div>
  );
}
