import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/customer/arsip-customer';
const TABLE = 'customers';

/** Kembalikan customer dari arsip (is_archived -> false). */
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: row } = await db.from(TABLE).select('id, nama_lengkap').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!row) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);
  const { error } = await db.from(TABLE).update({ is_archived: false }).eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `kembalikan customer dari arsip: ${row.nama_lengkap}`, TABLE, row.id);
  return ok({ message: 'Customer dikembalikan dari arsip.' });
}
