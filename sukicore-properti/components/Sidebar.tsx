'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutDashboard, Map as MapIcon, Building2, Pause, Wallet, ArrowLeftRight,
  Users, Megaphone, Hammer, Route, Waves, TrendingUp, TrendingDown, ShoppingCart,
  Settings, BookOpen, ChevronDown, Search, Menu as MenuIcon, X,
  Zap, Droplet, MessagesSquare, Landmark, PenLine, XCircle, UserPen, FileText,
  UserPlus, Upload, Archive, MessageCircleWarning, Key, ClipboardList, ListChecks,
  Milestone, PlugZap, FolderCheck, Receipt, FileSignature, HandCoins, BadgeDollarSign,
  Tags, ChartColumn, PackagePlus, PackageMinus, Factory, MapPin, LayoutGrid,
  Package, Truck, Ruler, Banknote, Stamp, Image, UserCog, ShieldCheck, KeyRound,
  Newspaper, Palette, History, Spline,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '@/lib/format';
import type { MenuItem } from '@/lib/permissions';

const ICONS: Record<string, LucideIcon> = {
  home: Home, 'layout-dashboard': LayoutDashboard, map: MapIcon, zap: Zap,
  droplet: Droplet, building: Building2, pause: Pause, wallet: Wallet,
  'messages-square': MessagesSquare, landmark: Landmark, 'pen-line': PenLine, repeat: ArrowLeftRight,
  'x-circle': XCircle, 'user-pen': UserPen, 'file-text': FileText, users: Users,
  'user-plus': UserPlus, upload: Upload, archive: Archive, 'message-circle-warning': MessageCircleWarning,
  key: Key, megaphone: Megaphone, 'clipboard-list': ClipboardList, hammer: Hammer,
  'list-checks': ListChecks, route: Route, milestone: Milestone, waves: Waves, spline: Spline,
  'plug-zap': PlugZap, 'folder-check': FolderCheck, receipt: Receipt, 'file-signature': FileSignature,
  'trending-up': TrendingUp, 'trending-down': TrendingDown, 'hand-coins': HandCoins,
  'badge-dollar-sign': BadgeDollarSign, tags: Tags, 'arrow-left-right': ArrowLeftRight,
  'chart-column': ChartColumn, 'shopping-cart': ShoppingCart, 'package-plus': PackagePlus,
  'package-minus': PackageMinus, factory: Factory, 'map-pin': MapPin, 'layout-grid': LayoutGrid,
  package: Package, truck: Truck, ruler: Ruler, banknote: Banknote, stamp: Stamp,
  settings: Settings, image: Image, 'user-cog': UserCog, 'shield-check': ShieldCheck,
  'key-round': KeyRound, newspaper: Newspaper, palette: Palette, history: History, 'book-open': BookOpen,
};

function iconFor(name: string | null): LucideIcon {
  return (name && ICONS[name]) || Home;
}

export function Sidebar({ menus }: { menus: MenuItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set<string>());

  const groups = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const m of menus) {
      if (query && !m.nama.toLowerCase().includes(query.toLowerCase())) continue;
      if (!map.has(m.grup)) map.set(m.grup, []);
      map.get(m.grup)!.push(m);
    }
    return [...map.entries()];
  }, [menus, query]);

  const toggleGroup = (g: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const nav = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4">
        <div>
          <div className="font-bold text-white">SUKICORE</div>
          <div className="text-xs text-slate-400">Properti ERP</div>
        </div>
        <button className="rounded p-1 hover:bg-slate-800 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
          <X size={20} />
        </button>
      </div>
      <div className="border-b border-slate-700 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu…"
            className="w-full rounded-lg bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {groups.map(([grup, items]) => (
          <div key={grup} className="mb-1">
            <button
              onClick={() => toggleGroup(grup)}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-800"
            >
              {grup}
              <ChevronDown size={14} className={cx('transition', collapsedGroups.has(grup) && '-rotate-90')} />
            </button>
            {!collapsedGroups.has(grup) &&
              items.map((m) => {
                const Icon = iconFor(m.icon);
                const active = pathname === m.path || pathname.startsWith(m.path + '/');
                return (
                  <Link
                    key={m.id}
                    href={m.path}
                    onClick={() => setOpen(false)}
                    className={cx(
                      'mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                      active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{m.nama}</span>
                  </Link>
                );
              })}
          </div>
        ))}
        {groups.length === 0 && <p className="p-4 text-sm text-slate-500">Menu tidak ditemukan.</p>}
      </nav>
      <div className="border-t border-slate-700 p-3 text-xs text-slate-500">SUKICORE Properti v1.0</div>
    </div>
  );

  return (
    <>
      <button
        className="fixed left-4 top-4 z-40 rounded-lg bg-slate-900 p-2 text-white shadow lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
      >
        <MenuIcon size={20} />
      </button>
      <aside className="hidden w-64 shrink-0 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">{nav}</aside>
        </div>
      )}
    </>
  );
}
