import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';
import { uploadToBucket, safeFileName } from '@/lib/upload';

const MENU = '/admin/customer/serah-terima-kunci';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

void optId;
void reqId;
void optNum;
void optText;
void optDate;

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('handovers')
    .select('id, customer_id, unit_id, tanggal, catatan, bukti_url, created_at, customers(nama_lengkap), units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.or(`catatan.ilike.%${q}%,customers.nama_lengkap.ilike.%${q}%`);
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

  const form = await req.formData().catch(() => null);
  if (!form) return err('BAD_FORM', 'Form tidak valid.', 400);

  const customerId = Number(form.get('customer_id')) || 0;
  if (!(customerId > 0)) return err('VALIDATION', 'Customer wajib dipilih.', 422);
  const tanggal = ((form.get('tanggal') as string | null) ?? '').trim();
  if (!tanggal) return err('VALIDATION', 'Tanggal wajib diisi.', 422);
  const catatan = ((form.get('catatan') as string | null) ?? '').trim() || null;
  const file = form.get('file');
  const hasFile = file instanceof File && file.size > 0;

  const db = supabaseAdmin();
  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) return err('VALIDATION', 'Customer tidak ditemukan.', 422);
  if (!customer.unit_id) return err('VALIDATION', 'Customer tidak memiliki unit.', 422);

  // Ubah status unit ke 'Serah Terima' terlebih dahulu.
  const r = await changeUnitStatus({
    unitId: customer.unit_id as number,
    toStatusName: 'Serah Terima',
    userId: auth.user.id,
    isSuperadmin: auth.user.role === 'SUPERADMIN',
    customerId,
  });
  if (!r.ok) return err('STATUS_TRANSITION', r.error ?? 'Gagal ubah status unit.', 422);

  let buktiUrl: string | null = null;
  if (hasFile && file instanceof File) {
    const path = `handover/${customerId}/${Date.now()}-${safeFileName(file.name)}`;
    try {
      buktiUrl = await uploadToBucket('lampiran', file, path);
    } catch (e) {
      return err('UPLOAD_FAILED', e instanceof Error ? e.message : 'Gagal mengunggah bukti.', 500);
    }
  }

  const { data, error } = await db
    .from('handovers')
    .insert({
      customer_id: customerId,
      unit_id: customer.unit_id,
      tanggal,
      catatan,
      bukti_url: buktiUrl,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, `serah terima kunci customer ${customer.nama_lengkap}`, 'handovers', data.id);
  return ok(data, undefined, 201);
}
