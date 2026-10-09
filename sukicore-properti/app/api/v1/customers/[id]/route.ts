import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { customerSchema } from '../route';

const MENU = '/admin/customer/customer';
const TABLE = 'customers';

async function validateFk(parsed: Record<string, unknown>): Promise<Response | null> {
  const refs: Array<[string, string, string]> = [
    ['marketing_id', 'marketing', 'Marketing'],
    ['admin_id', 'admin_staff', 'Admin pemberkasan'],
    ['unit_id', 'units', 'Unit'],
    ['status_id', 'unit_statuses', 'Status'],
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

const DETAIL_SELECT =
  '*, units(kode_kavling, luas_tanah, luas_bangunan, harga_jual), unit_statuses(nama), marketing(nama), admin_staff(nama)';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select(DETAIL_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, customerSchema);
  if (parsed instanceof Response) return parsed;
  const fkErr = await validateFk(parsed.data as unknown as Record<string, unknown>);
  if (fkErr) return fkErr;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .update({ ...(parsed.data as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, nama_lengkap')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);
    return err('DB_ERROR', error.message, 500);
  }
  await logActivity(auth.user.id, `edit customer: ${data.nama_lengkap}`, TABLE, data.id);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: row } = await db.from(TABLE).select('id, nama_lengkap').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!row) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);
  const { error } = await db
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `arsip/hapus customer: ${row.nama_lengkap}`, TABLE, row.id);
  return ok({ message: 'Customer diarsipkan.' });
}
