'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut, KeyRound, User } from 'lucide-react';
import type { SessionUser } from '@/lib/auth';
import { toast } from './ui';

export function Topbar({ user, title }: { user: SessionUser; title: string }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sukicore-theme');
    const isDark = saved === 'dark';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('sukicore-theme', next ? 'dark' : 'light');
  };

  const logout = async () => {
    const res = await fetch('/api/v1/auth/logout', { method: 'POST' });
    if (res.ok) router.push('/login');
    else toast('Gagal logout.', 'err');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <h1 className="ml-10 text-base font-semibold text-slate-800 dark:text-slate-100 lg:ml-0">{title}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Ganti tema"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800 sm:flex">
          <User size={16} className="text-slate-500" />
          <span className="font-medium text-slate-700 dark:text-slate-200">{user.nama_lengkap}</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            {user.role}
          </span>
        </div>
        <button
          onClick={() => router.push('/admin/ganti-password')}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Ganti password"
          title="Ganti password"
        >
          <KeyRound size={18} />
        </button>
        <button
          onClick={logout}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Keluar"
          title="Keluar"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
