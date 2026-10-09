import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getUserMenus } from '@/lib/permissions';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Toaster } from '@/components/ui';

// Data admin harus selalu fresh — jangan cache halaman admin

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const menus = await getUserMenus(user);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar menus={menus} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} title="SUKICORE Properti" />
        {user.must_change_password && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            ⚠️ Anda masih memakai password bawaan.{' '}
            <a href="/admin/ganti-password" className="font-semibold underline">
              Ganti password sekarang
            </a>{' '}
            demi keamanan.
          </div>
        )}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
        <footer className="border-t border-slate-200 px-6 py-3 text-xs text-slate-400 dark:border-slate-800">
          SUKICORE Properti v1.0 — ERP internal developer perumahan
        </footer>
      </div>
      <Toaster />
    </div>
  );
}
