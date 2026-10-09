import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/konten';
const TABLE = 'cms_contents';

const schema = z.object({
  key: z.string().trim().min(1, 'Key wajib diisi.').max(60, 'Maksimal 60 karakter.'),
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(160, 'Maksimal 160 karakter.'),
  posisi: z.string().trim().max(30).default('lainnya'),
  isi_html: z.string().max(50000, 'Isi terlalu panjang.').nullish().transform((v) => v ?? null),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: dup } = await db.from(TABLE).select('id').eq('key', parsed.data.key).neq('id', id).maybeSingle();
  if (dup) return err('DUPLICATE', 'Key sudah dipakai konten lain.', 409);

  const { data, error } = await db.from(TABLE).update(parsed.data).eq('id', id).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit konten #${id}: ${parsed.data.key}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus konten #${id}`, TABLE, Number(id));
  return ok({ message: 'Konten dihapus.' });
}
