'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cx } from '@/lib/format';

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-blue-600 hover:bg-blue-700 text-white',
    ghost: 'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200',
  };
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block space-y-1', className)}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, props.className)} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputCls, props.className)}>
      {children}
    </select>
  );
}

/* ---------- Card / Stat / Badge ---------- */
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900', className)}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </Card>
  );
}

export function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={color ? { backgroundColor: color + '33', borderColor: color, color: '#334155' } : undefined}
    >
      {!color && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{children}</span>}
      {color && <>{children}</>}
    </span>
  );
}

/** Badge status dengan warna dari DB (unit_statuses.warna_hex). */
export function StatusBadge({ nama, warna }: { nama: string; warna?: string | null }) {
  return <Badge color={warna ?? undefined}>{nama}</Badge>;
}

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title = 'Belum ada data', hint }: { title?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600">
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cx(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900',
          wide ? 'max-w-4xl' : 'max-w-lg'
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Pagination (via URL search params) ---------- */
export function Pagination({ total, perPage = 20 }: { total: number; perPage?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const go = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-500">
        Halaman {page} dari {pages} — total {total.toLocaleString('id-ID')} data
      </span>
      <div className="flex gap-1">
        <Button variant="secondary" disabled={page <= 1} onClick={() => go(page - 1)}>‹</Button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={i} className="px-2 py-2 text-slate-400">…</span>
          ) : (
            <Button key={i} variant={n === page ? 'primary' : 'secondary'} onClick={() => go(n)}>
              {n}
            </Button>
          )
        )}
        <Button variant="secondary" disabled={page >= pages} onClick={() => go(page + 1)}>›</Button>
      </div>
    </div>
  );
}

/* ---------- Toolbar pencarian ---------- */
export function SearchBox({ placeholder = 'Cari…' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [val, setVal] = React.useState(sp.get('q') ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (val.trim()) params.set('q', val.trim());
    else params.delete('q');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="w-64" />
      <Button type="submit" variant="secondary">Cari</Button>
    </form>
  );
}

/* ---------- Toast sederhana ---------- */
let toastFn: ((msg: string, kind?: 'ok' | 'err') => void) | null = null;
export function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  toastFn?.(msg, kind);
}

export function Toaster() {
  const [items, setItems] = React.useState<{ id: number; msg: string; kind: 'ok' | 'err' }[]>([]);
  useEffect(() => {
    toastFn = (msg, kind = 'ok') => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, msg, kind }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    return () => { toastFn = null; };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            'rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
            t.kind === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ---------- Tombol hapus dengan konfirmasi ---------- */
export function DeleteButton({
  onDelete,
  label = 'Hapus',
}: {
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  label?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const click = async () => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    setBusy(true);
    const r = await onDelete();
    setBusy(false);
    toast(r.ok ? 'Data dihapus.' : r.error ?? 'Gagal menghapus.', r.ok ? 'ok' : 'err');
    if (r.ok) window.location.reload();
  };
  return (
    <Button variant="danger" disabled={busy} onClick={click}>
      {busy ? '…' : label}
    </Button>
  );
}
