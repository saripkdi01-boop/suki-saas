import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { hashPassword } from '@/lib/auth';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/pengaturan-pengguna';
const TABLE = 'users';

const schema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter.').max(100, 'Maksimal 100 karakter.'),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: target } = await db.from(TABLE).select('id, username').eq('id', id).maybeSingle();
  if (!target) return err('NOT_FOUND', 'Pengguna tidak ditemukan.', 404);

  const { error } = await db
    .from(TABLE)
    .update({ password_hash: await hashPassword(parsed.data.password), must_change_password: true })
    .eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `reset password pengguna: ${target.username}`, TABLE, Number(id));
  return ok({ message: 'Password berhasil direset.' });
}
