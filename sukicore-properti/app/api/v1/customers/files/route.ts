import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { uploadToBucket, safeFileName } from '@/lib/upload';

const MENU = '/admin/customer/upload-file';

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
  const customerId = Number(new URL(req.url).searchParams.get('customer_id') ?? '') || 0;
  if (!customerId) return ok([]);
  const { data, error } = await supabaseAdmin()
    .from('customer_files')
    .select('id, customer_id, nama_file, file_url, keterangan, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) return err('DB_ERROR', error.message, 500);
  return ok(data ?? []);
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;

  const form = await req.formData().catch(() => null);
  if (!form) return err('BAD_FORM', 'Form tidak valid.', 400);

  const customerId = Number(form.get('customer_id')) || 0;
  if (!(customerId > 0)) return err('VALIDATION', 'Customer wajib dipilih.', 422);
  const keterangan = ((form.get('keterangan') as string | null) ?? '').trim() || null;
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return err('VALIDATION', 'File wajib diunggah.', 422);

  const db = supabaseAdmin();
  const { data: cust } = await db.from('customers').select('id').eq('id', customerId).maybeSingle();
  if (!cust) return err('VALIDATION', 'Customer tidak ditemukan.', 422);

  const path = `customer/${customerId}/${Date.now()}-${safeFileName(file.name)}`;
  let url: string;
  try {
    url = await uploadToBucket('lampiran', file, path);
  } catch (e) {
    return err('UPLOAD_FAILED', e instanceof Error ? e.message : 'Gagal mengunggah file.', 500);
  }

  const { data, error } = await db
    .from('customer_files')
    .insert({ customer_id: customerId, nama_file: file.name, file_url: url, keterangan })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, `upload file customer #${customerId}: ${file.name}`, 'customer_files', data.id);
  return ok(data, undefined, 201);
}
