import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/pengaturan-pengguna';
const TABLE = 'users';

const updateSchema = z.object({
  nama_lengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(120, 'Maksimal 120 karakter.'),
  role_id: z.coerce.number().int('Role wajib dipilih.'),
  is_active: z.boolean(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, updateSchema);
  if (parsed instanceof Response) return parsed;

  // Jangan sampai menonaktifkan akun sendiri
  if (Number(id) === auth.user.id && parsed.data.is_active === false) {
    return err('FORBIDDEN', 'Tidak boleh menonaktifkan akun sendiri.', 403);
  }

  const db = supabaseAdmin();
  const { data: role } = await db.from('roles').select('id').eq('id', parsed.data.role_id).maybeSingle();
  if (!role) return err('VALIDATION', 'Role tidak ditemukan.', 422);

  const { data, error } = await db
    .from(TABLE)
    .update({
      nama_lengkap: parsed.data.nama_lengkap,
      role_id: parsed.data.role_id,
      is_active: parsed.data.is_active,
    })
    .eq('id', id)
    .select('id, username, nama_lengkap')
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit pengguna #${id}: ${data.username}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: target } = await db.from(TABLE).select('id, username').eq('id', id).maybeSingle();
  if (!target) return err('NOT_FOUND', 'Pengguna tidak ditemukan.', 404);
  if (Number(id) === auth.user.id) {
    return err('FORBIDDEN', 'Tidak boleh menghapus akun sendiri.', 403);
  }
  if (target.username === 'master') {
    return err('FORBIDDEN', 'Akun master tidak boleh dihapus.', 403);
  }

  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus pengguna: ${target.username}`, TABLE, Number(id));
  return ok({ message: 'Pengguna dihapus.' });
}
