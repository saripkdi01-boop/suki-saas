import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
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
  'id, customer_id, unit_id, bank_kpr_id, tanggal, catatan, customers(id, nama_lengkap), units(kode_kavling), bank_kpr(nama)';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from('interviews').select(SELECT).eq('id', id).maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Data wawancara tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', parsed.data.customer_id)
    .maybeSingle();
  if (!customer) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);

  let unitId: number | null = (customer.unit_id as number | null) ?? null;
  if (parsed.data.unit_id) {
    const { data: unit } = await db.from('units').select('id').eq('id', parsed.data.unit_id).maybeSingle();
    if (!unit) return err('NOT_FOUND', 'Unit tidak ditemukan.', 404);
    unitId = parsed.data.unit_id;
  }
  if (parsed.data.bank_kpr_id) {
    const { data: bank } = await db.from('bank_kpr').select('id').eq('id', parsed.data.bank_kpr_id).maybeSingle();
    if (!bank) return err('NOT_FOUND', 'Bank KPR tidak ditemukan.', 404);
  }

  const { data, error } = await db
    .from('interviews')
    .update({
      customer_id: parsed.data.customer_id,
      unit_id: unitId,
      tanggal: parsed.data.tanggal,
      bank_kpr_id: parsed.data.bank_kpr_id ?? null,
      catatan: parsed.data.catatan ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(
    auth.user.id,
    `edit wawancara #${id} customer ${customer.nama_lengkap as string}`,
    'interviews',
    Number(id)
  );
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('interviews')
    .select('id, tanggal, customers(nama_lengkap)')
    .eq('id', id)
    .maybeSingle();
  const { error } = await db.from('interviews').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  const nama = (row?.customers as unknown as { nama_lengkap?: string } | null)?.nama_lengkap ?? `#${id}`;
  await logActivity(auth.user.id, `hapus wawancara #${id} customer ${nama}`, 'interviews', Number(id));
  return ok({ message: 'Dihapus.' });
}
