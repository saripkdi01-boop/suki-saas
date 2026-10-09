import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/keuangan/kategori-transaksi';

export const categorySchema = z.object({
  nama: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(100),
  tipe: z.enum(['pemasukan', 'pengeluaran'], { message: 'Tipe harus pemasukan atau pengeluaran.' }),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  const u = new URL(req.url);
  const tipe = u.searchParams.get('tipe');
  let query = supabaseAdmin()
    .from('finance_categories')
    .select('*', { count: 'exact' })
    .order('tipe')
    .order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
  if (tipe === 'pemasukan' || tipe === 'pengeluaran') query = query.eq('tipe', tipe);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, categorySchema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from('finance_categories').insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah kategori ${parsed.data.tipe}: ${parsed.data.nama}`, 'finance_categories', data.id);
  return ok(data, undefined, 201);
}
