import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/list-penjualan';
const TABLE = 'unit_statuses';

const schema = z.object({
  nama: z.string().trim().min(1, 'Nama status wajib diisi.').max(60, 'Maksimal 60 karakter.'),
  warna_hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Format warna harus hex, cth: #ffffff.'),
  urutan: z.coerce.number().int().min(0).default(0),
  keterangan: z.string().trim().max(255).nullish().transform((v) => v || null),
});

export async function GET() {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { data, error } = await supabaseAdmin().from(TABLE).select('*').order('urutan').order('nama');
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
  if (dup) return err('DUPLICATE', 'Nama status sudah dipakai.', 409);

  const { data, error } = await db.from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah status: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
