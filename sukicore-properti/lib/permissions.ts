import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabase';
import { getSessionUser, SessionUser } from './auth';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

const ACTION_COL: Record<PermAction, string> = {
  view: 'can_view',
  create: 'can_create',
  edit: 'can_edit',
  delete: 'can_delete',
};

export interface MenuItem {
  id: number;
  grup: string;
  nama: string;
  path: string;
  urutan: number;
  icon: string | null;
}

/** Matriks izin role → dimuat sekali per request. */
const getRolePermissions = cache(async (roleId: number) => {
  const db = supabaseAdmin();
  const { data } = await db
    .from('permissions')
    .select('can_view, can_create, can_edit, can_delete, menus!inner(path)')
    .eq('role_id', roleId);
  const map = new Map<string, Record<PermAction, boolean>>();
  for (const row of data ?? []) {
    const path = (row.menus as unknown as { path: string })?.path;
    if (!path) continue;
    map.set(path, {
      view: Boolean(row.can_view),
      create: Boolean(row.can_create),
      edit: Boolean(row.can_edit),
      delete: Boolean(row.can_delete),
    });
  }
  return map;
});

export async function can(
  user: SessionUser,
  path: string,
  action: PermAction = 'view'
): Promise<boolean> {
  if (user.role === 'SUPERADMIN') return true;
  const perms = await getRolePermissions(user.role_id);
  return perms.get(path)?.[action] ?? false;
}

/** Untuk Server Component halaman: pastikan login + izin, atau redirect. */
export async function requirePerm(path: string, action: PermAction = 'view'): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const allowed = await can(user, path, action);
  if (!allowed) redirect('/admin/beranda?denied=1');
  return user;
}

/** Untuk Route Handler: kembalikan Response 401/403 atau user. */
export async function apiRequirePerm(
  path: string,
  action: PermAction = 'view'
): Promise<{ user: SessionUser } | Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Belum login.' } }, { status: 401 });
  }
  const allowed = await can(user, path, action);
  if (!allowed) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'Tidak punya izin untuk aksi ini.' } },
      { status: 403 }
    );
  }
  return { user };
}

/** Menu sidebar sesuai izin view user, dikelompokkan. */
export const getUserMenus = cache(async (user: SessionUser) => {
  const db = supabaseAdmin();
  const { data } = await db.from('menus').select('id, grup, nama, path, urutan, icon').order('urutan');
  const menus = (data ?? []) as MenuItem[];
  if (user.role === 'SUPERADMIN') return menus;
  const perms = await getRolePermissions(user.role_id);
  return menus.filter((m) => perms.get(m.path)?.view);
});

export function groupMenus(menus: MenuItem[]): { grup: string; items: MenuItem[] }[] {
  const groups = new Map<string, MenuItem[]>();
  for (const m of menus) {
    if (!groups.has(m.grup)) groups.set(m.grup, []);
    groups.get(m.grup)!.push(m);
  }
  return [...groups.entries()].map(([grup, items]) => ({ grup, items }));
}
