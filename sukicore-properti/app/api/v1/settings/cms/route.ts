import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengaturan/konten';
const TABLE = 'cms_contents';

const schema = z.object({
  key: z.string().trim().min(1, 'Key wajib diisi.').max(60, 'Maksimal 60 karakter.'),
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(160, 'Maksimal 160 karakter.'),
  posisi: z.string().trim().max(30).default('lainnya'),
  isi_html: z.string().max(50000, 'Isi terlalu panjang.').nullish().transform((v) => v ?? null),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*', { count: 'exact' }).order('key');
  if (q) query = query.or(`key.ilike.%${q}%,judul.ilike.%${q}%`);
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

  const db = supabaseAdmin();
  const { data: dup } = await db.from(TABLE).select('id').eq('key', parsed.data.key).maybeSingle();
  if (dup) return err('DUPLICATE', 'Key sudah dipakai.', 409);

  const { data, error } = await db.from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah konten: ${parsed.data.key}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
