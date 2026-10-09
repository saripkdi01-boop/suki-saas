import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/customer/aduan-customer';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

void optId;
void optNum;
void optDate;

const schema = z.object({
  customer_id: reqId,
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  isi: optText,
  status: z.enum(['terbuka', 'diproses', 'selesai']).default('terbuka'),
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('customer_complaints')
    .select('id, customer_id, judul, isi, status, created_at, updated_at, customers(nama_lengkap)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) query = query.or(`judul.ilike.%${q}%,isi.ilike.%${q}%`);
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
  const input = parsed.data as z.infer<typeof schema>;

  const db = supabaseAdmin();
  const { data: cust } = await db.from('customers').select('id').eq('id', input.customer_id).maybeSingle();
  if (!cust) return err('VALIDATION', 'Customer tidak ditemukan.', 422);

  const { data, error } = await db
    .from('customer_complaints')
    .insert({ customer_id: input.customer_id, judul: input.judul, isi: input.isi, status: input.status })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah aduan: ${input.judul}`, 'customer_complaints', data.id);
  return ok(data, undefined, 201);
}
