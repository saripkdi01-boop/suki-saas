'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Select, toast } from '@/components/ui';
import { apiPut } from '@/lib/client-api';

interface MenuItem {
  id: number;
  grup: string;
  nama: string;
  path: string;
}

interface Perm {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const EMPTY: Perm = { can_view: false, can_create: false, can_edit: false, can_delete: false };
const PERM_COLS = [
  { key: 'can_view' as const, label: 'Lihat' },
  { key: 'can_create' as const, label: 'Tambah' },
  { key: 'can_edit' as const, label: 'Edit' },
  { key: 'can_delete' as const, label: 'Hapus' },
];

export function MatrixForm({
  roleId,
  roleName,
  roles,
  menus,
  perms,
  canEdit,
}: {
  roleId: number;
  roleName: string;
  roles: { id: number; nama: string }[];
  menus: MenuItem[];
  perms: Record<number, Perm>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<number, Perm>>(perms);
  const [busy, setBusy] = useState(false);
  const isSuper = roleName === 'SUPERADMIN';

  const groups = new Map<string, MenuItem[]>();
  for (const m of menus) {
    if (!groups.has(m.grup)) groups.set(m.grup, []);
    groups.get(m.grup)!.push(m);
  }

  const toggle = (menuId: number, key: keyof Perm) => {
    setState((s) => ({
      ...s,
      [menuId]: { ...(s[menuId] ?? EMPTY), [key]: !(s[menuId]?.[key] ?? false) },
    }));
  };

  const save = async () => {
    setBusy(true);
    const items = menus.map((m) => ({ menu_id: m.id, ...(state[m.id] ?? EMPTY) }));
    const r = await apiPut('/api/v1/settings/permissions', { role_id: roleId, items });
    setBusy(false);
    toast(r.ok ? 'Hak akses tersimpan.' : r.error ?? 'Gagal menyimpan.', r.ok ? 'ok' : 'err');
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Role:</span>
          <Select value={String(roleId)} onChange={(e) => router.push(`?role_id=${e.target.value}`)} className="w-56">
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama}
              </option>
            ))}
          </Select>
          {canEdit && !isSuper && (
            <Button onClick={save} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan Hak Akses'}
            </Button>
          )}
        </div>
        {isSuper && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            SUPERADMIN memiliki akses penuh ke semua menu dan matriksnya tidak dapat diubah.
          </p>
        )}
      </Card>

      {!isSuper &&
        [...groups.entries()].map(([grup, items]) => (
          <Card key={grup}>
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{grup}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">Menu</th>
                    {PERM_COLS.map((c) => (
                      <th key={c.key} className="w-24 px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((m) => {
                    const p = state[m.id] ?? EMPTY;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{m.nama}</div>
                          <div className="text-xs text-slate-400">{m.path}</div>
                        </td>
                        {PERM_COLS.map((c) => (
                          <td key={c.key} className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={p[c.key]}
                              disabled={!canEdit}
                              onChange={() => toggle(m.id, c.key)}
                              className="h-4 w-4 rounded accent-emerald-600"
                              aria-label={`${c.label} — ${m.nama}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
    </div>
  );
}
