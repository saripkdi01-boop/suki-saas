import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { prospekSchema } from '../route';

const MENU = '/admin/customer/prospek';
const TABLE = 'prospects';

async function validateFk(parsed: Record<string, unknown>): Promise<Response | null> {
  const refs: Array<[string, string, string]> = [
    ['location_id', 'locations', 'Lokasi'],
    ['marketing_id', 'marketing', 'Marketing'],
  ];
  const db = supabaseAdmin();
  for (const [key, table, label] of refs) {
    const id = parsed[key] as number | undefined;
    if (id === undefined) continue;
    const { data } = await db.from(table).select('id').eq('id', id).maybeSingle();
    if (!data) return err('FK_INVALID', `${label} #${id} tidak ditemukan.`, 422);
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select('id, nama_lengkap, no_hp, alamat, sumber, status, location_id, marketing_id, locations(nama), marketing(nama)')
    .eq('id', id)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Prospek tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, prospekSchema);
  if (parsed instanceof Response) return parsed;
  const fkErr = await validateFk(parsed.data as unknown as Record<string, unknown>);
  if (fkErr) return fkErr;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .update(parsed.data)
    .eq('id', id)
    .select('id, nama_lengkap')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return err('NOT_FOUND', 'Prospek tidak ditemukan.', 404);
    return err('DB_ERROR', error.message, 500);
  }
  await logActivity(auth.user.id, `edit prospek: ${data.nama_lengkap}`, TABLE, data.id);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: row } = await db.from(TABLE).select('id, nama_lengkap').eq('id', id).maybeSingle();
  if (!row) return err('NOT_FOUND', 'Prospek tidak ditemukan.', 404);
  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus prospek: ${row.nama_lengkap}`, TABLE, row.id);
  return ok({ message: 'Dihapus.' });
}
