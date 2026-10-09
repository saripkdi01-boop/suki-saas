import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/legal/listrik-air';
const TABLE = 'utility_status';

const strOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().trim().max(255).nullable()
);

export const utilitySchema = z.object({
  unit_id: z.coerce.number().int().positive('Unit wajib dipilih.'),
  listrik_terpasang: z.coerce.boolean().default(false),
  air_terpasang: z.coerce.boolean().default(false),
  no_rekening_listrik: strOpt,
  foto_url: strOpt,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select('*, units!inner(kode_kavling, locations(nama))', { count: 'exact' })
    .order('id');
  if (q) query = query.ilike('units.kode_kavling', `%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

/** POST = upsert berdasarkan unit_id (satu unit hanya punya satu baris status). */
export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, utilitySchema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from(TABLE)
    .select('id')
    .eq('unit_id', parsed.data.unit_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from(TABLE)
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return err('DB_ERROR', error.message, 500);
    await logActivity(auth.user.id, `perbarui status listrik-air unit #${parsed.data.unit_id}`, TABLE, data.id);
    return ok(data);
  }

  const { data, error } = await db.from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah status listrik-air unit #${parsed.data.unit_id}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
