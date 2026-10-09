import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/wawancara';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  customer_id: reqId,
  tanggal: z
    .string()
    .trim()
    .min(1, 'Tanggal wajib diisi.')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid.'),
  bank_kpr_id: optId,
  catatan: optText,
  unit_id: optId,
});

const SELECT =
  'id, customer_id, unit_id, bank_kpr_id, tanggal, catatan, customers!inner(id, nama_lengkap), units(kode_kavling), bank_kpr(nama)';

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('interviews')
    .select(SELECT, { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('customers.nama_lengkap', `%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

async function validateFk(
  customerId: number,
  unitId: number | undefined,
  bankKprId: number | undefined
): Promise<{ customer: { id: number; nama_lengkap: string; unit_id: number | null }; unitId: number | null } | Response> {
  const db = supabaseAdmin();
  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);

  let finalUnitId: number | null = (customer.unit_id as number | null) ?? null;
  if (unitId) {
    const { data: unit } = await db.from('units').select('id').eq('id', unitId).maybeSingle();
    if (!unit) return err('NOT_FOUND', 'Unit tidak ditemukan.', 404);
    finalUnitId = unitId;
  }
  if (bankKprId) {
    const { data: bank } = await db.from('bank_kpr').select('id').eq('id', bankKprId).maybeSingle();
    if (!bank) return err('NOT_FOUND', 'Bank KPR tidak ditemukan.', 404);
  }
  return {
    customer: customer as unknown as { id: number; nama_lengkap: string; unit_id: number | null },
    unitId: finalUnitId,
  };
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const checked = await validateFk(parsed.data.customer_id, parsed.data.unit_id, parsed.data.bank_kpr_id);
  if (checked instanceof Response) return checked;

  const { data, error } = await supabaseAdmin()
    .from('interviews')
    .insert({
      customer_id: parsed.data.customer_id,
      unit_id: checked.unitId,
      tanggal: parsed.data.tanggal,
      bank_kpr_id: parsed.data.bank_kpr_id ?? null,
      catatan: parsed.data.catatan ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(
    auth.user.id,
    `jadwalkan wawancara customer ${checked.customer.nama_lengkap} (${parsed.data.tanggal})`,
    'interviews',
    data.id
  );
  return ok(data, undefined, 201);
}
