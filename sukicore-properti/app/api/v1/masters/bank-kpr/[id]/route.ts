import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/bank-kpr';
const TABLE = 'bank_kpr';

const schema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(50, 'Maksimal 50 karakter.'),
});

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return err('DUPLICATE', 'Nama bank KPR sudah dipakai.', 409);
  return err('DB_ERROR', error.message, 500);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .update({ nama: parsed.data.nama.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) return friendly(error);
  await logActivity(auth.user.id, `edit bank KPR #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus bank KPR #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
