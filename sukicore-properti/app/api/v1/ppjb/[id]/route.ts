import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/ppjb';
const TABLE = 'ppjb';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  tanggal: z.preprocess(emptyToUndef, z.string().min(1, 'Tanggal wajib diisi.')),
  no_ppjb: z.string().trim().min(1, 'No. PPJB wajib diisi.'),
  customer_id: reqId,
  nominal: optNum,
  keterangan: optText,
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select('*, customer:customers(nama_lengkap), unit:units(kode_kavling)')
    .eq('id', id)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Data tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;

  const db = supabaseAdmin();

  const { data: existing } = await db.from(TABLE).select('id, no_ppjb').eq('id', id).maybeSingle();
  if (!existing) return err('NOT_FOUND', 'Data tidak ditemukan.', 404);

  // Cek duplikat nomor PPJB bila berubah
  if (d.no_ppjb !== (existing as { no_ppjb: string }).no_ppjb) {
    const { data: dup } = await db.from(TABLE).select('id').eq('no_ppjb', d.no_ppjb).limit(1);
    if (dup && dup.length > 0) return err('DUPLICATE', 'Nomor PPJB sudah digunakan.', 409);
  }

  // Unit mengikuti customer yang dipilih
  const { data: customer } = await db.from('customers').select('id, unit_id').eq('id', d.customer_id).maybeSingle();
  const unitId = (customer as { unit_id: number | null } | null)?.unit_id;
  if (!unitId) return err('VALIDATION', 'Customer tidak memiliki unit aktif.', 422);

  const { data, error } = await db
    .from(TABLE)
    .update({
      tanggal: d.tanggal,
      no_ppjb: d.no_ppjb,
      customer_id: d.customer_id,
      unit_id: unitId,
      nominal: d.nominal ?? null,
      keterangan: d.keterangan ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, `edit PPJB #${id}: ${d.no_ppjb}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus PPJB #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
