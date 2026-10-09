import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
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

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*', { count: 'exact' }).order('nama');
  if (q) query = query.ilike('nama', `%${q}%`);
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
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .insert({ nama: parsed.data.nama.trim() })
    .select()
    .single();
  if (error) return friendly(error);
  await logActivity(auth.user.id, `tambah bank KPR: ${parsed.data.nama}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
