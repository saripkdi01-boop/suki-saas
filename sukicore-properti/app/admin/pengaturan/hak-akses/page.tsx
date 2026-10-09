import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader } from '@/components/ui';
import { MatrixForm } from './MatrixForm';

const MENU = '/admin/pengaturan/hak-akses';

interface Role {
  id: number;
  nama: string;
}

interface MenuRow {
  id: number;
  grup: string;
  nama: string;
  path: string;
}

interface PermRow {
  menu_id: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export default async function HakAksesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const sp = await searchParams;
  const rawRole = Array.isArray(sp.role_id) ? sp.role_id[0] : sp.role_id;

  const db = supabaseAdmin();
  const { data: rolesData } = await db.from('roles').select('id, nama').order('id');
  const roles = (rolesData ?? []) as Role[];
  const defaultRole = roles.find((r) => r.nama !== 'SUPERADMIN') ?? roles[0];
  const roleId = rawRole ? Number(rawRole) : defaultRole?.id;
  const role = roles.find((r) => r.id === roleId) ?? defaultRole;

  const { data: menusData } = await db.from('menus').select('id, grup, nama, path').order('urutan');
  const menus = (menusData ?? []) as MenuRow[];

  const perms: Record<number, PermRow> = {};
  if (role) {
    const { data: permData } = await db
      .from('permissions')
      .select('menu_id, can_view, can_create, can_edit, can_delete')
      .eq('role_id', role.id);
    for (const p of (permData ?? []) as PermRow[]) {
      perms[p.menu_id] = p;
    }
  }

  return (
    <div>
      <PageHeader title="Hak Akses" subtitle="Matriks izin per role untuk setiap menu" />
      {role && (
        <MatrixForm
          roleId={role.id}
          roleName={role.nama}
          roles={roles}
          menus={menus}
          perms={perms}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
