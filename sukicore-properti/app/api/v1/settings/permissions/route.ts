import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/hak-akses';

const itemSchema = z.object({
  menu_id: z.coerce.number().int(),
  can_view: z.boolean(),
  can_create: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});

const schema = z.object({
  role_id: z.coerce.number().int('Role wajib dipilih.'),
  items: z.array(itemSchema).min(1, 'Daftar izin kosong.'),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const roleId = new URL(req.url).searchParams.get('role_id');
  if (!roleId) return err('VALIDATION', 'Parameter role_id wajib.', 422);

  const db = supabaseAdmin();
  const { data: menus, error: mErr } = await db.from('menus').select('id, grup, nama, path').order('urutan');
  if (mErr) return err('DB_ERROR', mErr.message, 500);
  const { data: perms, error: pErr } = await db
    .from('permissions')
    .select('menu_id, can_view, can_create, can_edit, can_delete')
    .eq('role_id', Number(roleId));
  if (pErr) return err('DB_ERROR', pErr.message, 500);

  const map: Record<number, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};
  for (const p of (perms ?? []) as { menu_id: number; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]) {
    map[p.menu_id] = {
      can_view: p.can_view,
      can_create: p.can_create,
      can_edit: p.can_edit,
      can_delete: p.can_delete,
    };
  }
  return ok({ menus, permissions: map });
}

export async function PUT(req: Request) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: role } = await db.from('roles').select('id, nama').eq('id', parsed.data.role_id).maybeSingle();
  if (!role) return err('VALIDATION', 'Role tidak ditemukan.', 422);
  if (role.nama === 'SUPERADMIN') {
    return err('FORBIDDEN', 'Matriks SUPERADMIN tidak dapat diubah.', 403);
  }

  const rows = parsed.data.items.map((it) => ({
    role_id: parsed.data.role_id,
    menu_id: it.menu_id,
    can_view: it.can_view,
    can_create: it.can_create,
    can_edit: it.can_edit,
    can_delete: it.can_delete,
  }));
  const { error } = await db.from('permissions').upsert(rows, { onConflict: 'role_id,menu_id' });
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `ubah hak akses role: ${role.nama}`, 'permissions', parsed.data.role_id);
  return ok({ message: 'Hak akses tersimpan.' });
}
