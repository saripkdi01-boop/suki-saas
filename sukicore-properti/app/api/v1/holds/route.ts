import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pengajuan-hold';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  unit_id: reqId,
  customer_id: optId,
  jumlah: optNum,
  lampiran_url: optText,
  catatan: optText,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('hold_requests')
    .select('*, units(kode_kavling), customers(nama_lengkap)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (q) query = query.or(`catatan.ilike.%${q}%`);
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
  const d = parsed.data;

  const db = supabaseAdmin();
  const { data: unit } = await db.from('units').select('id, kode_kavling').eq('id', d.unit_id).maybeSingle();
  if (!unit) return err('VALIDATION', 'Unit tidak ditemukan.', 422);
  if (d.customer_id) {
    const { data: cust } = await db.from('customers').select('id').eq('id', d.customer_id).maybeSingle();
    if (!cust) return err('VALIDATION', 'Customer tidak ditemukan.', 422);
  }

  const { data, error } = await db
    .from('hold_requests')
    .insert({
      unit_id: d.unit_id,
      customer_id: d.customer_id ?? null,
      jumlah: d.jumlah ?? null,
      lampiran_url: d.lampiran_url,
      catatan: d.catatan,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, `ajukan hold unit ${unit.kode_kavling}`, 'hold_requests', data.id);
  return ok(data, undefined, 201);
}
