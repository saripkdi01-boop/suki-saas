import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/legal/pengajuan-berkas';
const TABLE = 'legal_checklists';

const boolOpt = z.preprocess(
  (v) => (v === undefined ? false : v),
  z.coerce.boolean().default(false)
);

export const checklistSchema = z.object({
  customer_id: z.coerce.number().int().positive('Customer wajib dipilih.'),
  unit_id: z.coerce.number().int().positive('Unit wajib dipilih.'),
  iph: boolOpt,
  shgb: boolOpt,
  ssp: boolOpt,
  bphtb: boolOpt,
  sikumbang: boolOpt,
  daftar_sikasep: boolOpt,
  foto_sikasep: boolOpt,
  trilogi: boolOpt,
  catatan: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().trim().max(2000).nullable()
  ),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage } = pageParams(req.url);
  const cid = new URL(req.url).searchParams.get('customer_id');
  let query = supabaseAdmin()
    .from(TABLE)
    .select('*, units(kode_kavling)', { count: 'exact' })
    .order('updated_at', { ascending: false });
  if (cid) query = query.eq('customer_id', Number(cid));
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

/** POST = upsert berdasarkan pasangan (customer_id, unit_id). */
export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, checklistSchema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from(TABLE)
    .select('id')
    .eq('customer_id', parsed.data.customer_id)
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
    await logActivity(auth.user.id, `perbarui checklist berkas customer #${parsed.data.customer_id}`, TABLE, data.id);
    return ok(data);
  }

  const { data, error } = await db.from(TABLE).insert(parsed.data).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah checklist berkas customer #${parsed.data.customer_id}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
