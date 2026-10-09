import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { workTypeSchema } from '../route';

const MENU = '/admin/op-bangunan/jenis-pekerjaan-bangunan';
const TABLE = 'building_work_types';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, workTypeSchema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).update(parsed.data).eq('id', id).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit jenis pekerjaan bangunan #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus jenis pekerjaan bangunan #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
