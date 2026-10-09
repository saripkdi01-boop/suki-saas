import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/supplier';
const TABLE = 'suppliers';

const schema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  alamat: z.string().trim().max(500).optional().or(z.literal('')),
  telepon: z.string().trim().max(30).optional().or(z.literal('')),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  const s = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null);
  return { nama: d.nama.trim(), alamat: s(d.alamat), telepon: s(d.telepon) };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).update(clean(parsed.data)).eq('id', id).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit supplier #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus supplier #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
