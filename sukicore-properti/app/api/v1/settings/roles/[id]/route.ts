import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/role-user';
const TABLE = 'roles';

const schema = z.object({
  nama: z.string().trim().min(1, 'Nama role wajib diisi.').max(40, 'Maksimal 40 karakter.'),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: current } = await db.from(TABLE).select('id, nama').eq('id', id).maybeSingle();
  if (!current) return err('NOT_FOUND', 'Role tidak ditemukan.', 404);
  if (current.nama === 'SUPERADMIN') {
    return err('FORBIDDEN', 'Role SUPERADMIN tidak boleh diubah namanya.', 403);
  }
  const { data: dup } = await db
    .from(TABLE)
    .select('id')
    .eq('nama', parsed.data.nama)
    .neq('id', id)
    .maybeSingle();
  if (dup) return err('DUPLICATE', 'Nama role sudah dipakai.', 409);

  const { data, error } = await db.from(TABLE).update({ nama: parsed.data.nama }).eq('id', id).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit role #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: current } = await db.from(TABLE).select('id, nama').eq('id', id).maybeSingle();
  if (!current) return err('NOT_FOUND', 'Role tidak ditemukan.', 404);
  if (current.nama === 'SUPERADMIN') {
    return err('FORBIDDEN', 'Role SUPERADMIN tidak boleh dihapus.', 403);
  }
  const { count } = await db.from('users').select('id', { count: 'exact', head: true }).eq('role_id', id);
  if ((count ?? 0) > 0) {
    return err('IN_USE', `Role masih dipakai ${count} pengguna. Pindahkan dulu penggunanya.`, 409);
  }

  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus role: ${current.nama}`, TABLE, Number(id));
  return ok({ message: 'Role dihapus.' });
}
