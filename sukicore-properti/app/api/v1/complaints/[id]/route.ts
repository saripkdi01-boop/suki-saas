import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('customer_complaints')
    .select('id, customer_id, judul, isi, status, created_at, updated_at, customers(nama_lengkap)')
    .eq('id', id)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Aduan tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const input = parsed.data as z.infer<typeof schema>;

  const db = supabaseAdmin();
  const { data: cust } = await db.from('customers').select('id').eq('id', input.customer_id).maybeSingle();
  if (!cust) return err('VALIDATION', 'Customer tidak ditemukan.', 422);

  const { data, error } = await db
    .from('customer_complaints')
    .update({ customer_id: input.customer_id, judul: input.judul, isi: input.isi, status: input.status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit aduan: ${input.judul}`, 'customer_complaints', data.id);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: row } = await db.from('customer_complaints').select('id, judul').eq('id', id).maybeSingle();
  if (!row) return err('NOT_FOUND', 'Aduan tidak ditemukan.', 404);
  const { error } = await db.from('customer_complaints').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus aduan: ${row.judul}`, 'customer_complaints', Number(id));
  return ok({ message: 'Dihapus.' });
}
