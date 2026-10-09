import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('hold_requests')
    .select('*, units(kode_kavling), customers(nama_lengkap)')
    .eq('id', Number(id))
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Pengajuan hold tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;

  const db = supabaseAdmin();
  const { data: unit } = await db.from('units').select('id').eq('id', d.unit_id).maybeSingle();
  if (!unit) return err('VALIDATION', 'Unit tidak ditemukan.', 422);
  if (d.customer_id) {
    const { data: cust } = await db.from('customers').select('id').eq('id', d.customer_id).maybeSingle();
    if (!cust) return err('VALIDATION', 'Customer tidak ditemukan.', 422);
  }

  const { data, error } = await db
    .from('hold_requests')
    .update({
      unit_id: d.unit_id,
      customer_id: d.customer_id ?? null,
      jumlah: d.jumlah ?? null,
      lampiran_url: d.lampiran_url,
      catatan: d.catatan,
    })
    .eq('id', Number(id))
    .select()
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Pengajuan hold tidak ditemukan.', 404);

  await logActivity(auth.user.id, `edit pengajuan hold #${id}`, 'hold_requests', Number(id));
  return ok(data);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('hold_requests')
    .delete()
    .eq('id', Number(id))
    .select('id')
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Pengajuan hold tidak ditemukan.', 404);

  await logActivity(auth.user.id, `hapus pengajuan hold #${id}`, 'hold_requests', Number(id));
  return ok({ deleted: true });
}
