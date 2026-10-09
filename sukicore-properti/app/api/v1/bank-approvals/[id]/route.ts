import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/acc-bank';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

const schema = z.object({
  customer_id: reqId,
  plafon_acc: optNum,
  tgl_sp3k: optDate,
  tgl_expired: optDate,
  keterangan: optText,
});

const SELECT =
  'id, customer_id, plafon_acc, tgl_sp3k, tgl_expired, keterangan, customers(id, nama_lengkap, units(kode_kavling))';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from('bank_approvals').select(SELECT).eq('id', id).maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Data persetujuan bank tidak ditemukan.', 404);
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
    .select('id, nama_lengkap')
    .eq('id', parsed.data.customer_id)
    .maybeSingle();
  if (!customer) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);

  const { data, error } = await db
    .from('bank_approvals')
    .update({
      customer_id: parsed.data.customer_id,
      plafon_acc: parsed.data.plafon_acc ?? null,
      tgl_sp3k: parsed.data.tgl_sp3k ?? null,
      tgl_expired: parsed.data.tgl_expired ?? null,
      keterangan: parsed.data.keterangan ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(
    auth.user.id,
    `edit persetujuan bank #${id} customer ${customer.nama_lengkap as string}`,
    'bank_approvals',
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
    .from('bank_approvals')
    .select('id, customers(nama_lengkap)')
    .eq('id', id)
    .maybeSingle();
  const { error } = await db.from('bank_approvals').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  const nama = (row?.customers as unknown as { nama_lengkap?: string } | null)?.nama_lengkap ?? `#${id}`;
  await logActivity(auth.user.id, `hapus persetujuan bank #${id} customer ${nama}`, 'bank_approvals', Number(id));
  return ok({ message: 'Dihapus.' });
}
