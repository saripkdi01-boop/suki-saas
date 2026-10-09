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

export async function GET() {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { data, error } = await supabaseAdmin().from(TABLE).select('id, nama, created_at').order('id');
  if (error) return err('DB_ERROR', error.message, 500);
  return ok(data);
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: dup } = await db.from(TABLE).select('id').eq('nama', parsed.data.nama).maybeSingle();
  if (dup) return err('DUPLICATE', 'Nama role sudah dipakai.', 409);

  const { data, error } = await db.from(TABLE).insert({ nama: parsed.data.nama }).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah role: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
