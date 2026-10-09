import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/lokasi-kavling';
const TABLE = 'locations';

const schema = z.object({
  kode: z.string().trim().min(1, 'Kode wajib diisi.').max(20, 'Maksimal 20 karakter.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  alamat: z.string().trim().max(500).optional().or(z.literal('')),
  company_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().nullable()
  ),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  return {
    kode: d.kode.trim().toUpperCase(),
    nama: d.nama.trim(),
    alamat: d.alamat && d.alamat.trim() !== '' ? d.alamat.trim() : null,
    company_id: d.company_id,
  };
}

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return err('DUPLICATE', 'Kode lokasi sudah dipakai.', 409);
  return err('DB_ERROR', error.message, 500);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).update(clean(parsed.data)).eq('id', id).select().single();
  if (error) return friendly(error);
  await logActivity(auth.user.id, `edit lokasi #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus lokasi #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
