import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/barang';
const TABLE = 'items';

const numNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nullable()
);

const schema = z.object({
  kode: z.string().trim().min(1, 'Kode wajib diisi.').max(30, 'Maksimal 30 karakter.'),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  satuan_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().nullable()
  ),
  stok: z.preprocess((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)), z.number().int().min(0)),
  harga_beli: numNull,
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  return {
    kode: d.kode.trim().toUpperCase(),
    nama: d.nama.trim(),
    satuan_id: d.satuan_id,
    stok: d.stok ?? 0,
    harga_beli: d.harga_beli,
  };
}

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return err('DUPLICATE', 'Kode barang sudah dipakai.', 409);
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
  await logActivity(auth.user.id, `edit barang #${id}: ${parsed.data.nama}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus barang #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
