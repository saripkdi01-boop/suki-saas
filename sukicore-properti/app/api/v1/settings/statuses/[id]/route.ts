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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: dup } = await db.from(TABLE).select('id').eq('nama', parsed.data.nama).neq('id', id).maybeSingle();
  if (dup) return err('DUPLICATE', 'Nama status sudah dipakai status lain.', 409);

  const { data, error } = await db.from(TABLE).update(parsed.data).eq('id', id).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit status #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { count } = await db.from('units').select('id', { count: 'exact', head: true }).eq('status_id', id);
  if ((count ?? 0) > 0) {
    return err('IN_USE', `Status masih dipakai ${count} unit. Pindahkan dulu unitnya.`, 409);
  }

  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus status #${id}`, TABLE, Number(id));
  return ok({ message: 'Status dihapus.' });
}
