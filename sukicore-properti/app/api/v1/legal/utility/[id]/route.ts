import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { utilitySchema } from '../route';

const MENU = '/admin/legal/listrik-air';
const TABLE = 'utility_status';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, utilitySchema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: clash } = await db
    .from(TABLE)
    .select('id')
    .eq('unit_id', parsed.data.unit_id)
    .neq('id', Number(id))
    .maybeSingle();
  if (clash) return err('DUPLICATE', 'Unit tersebut sudah memiliki data status.', 409);

  const { data, error } = await db
    .from(TABLE)
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit status listrik-air #${id}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus status listrik-air #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
