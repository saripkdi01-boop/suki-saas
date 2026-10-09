import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pembayaran';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

const JENIS = ['harga_rumah', 'biaya_surat', 'peningkatan_mutu', 'booking_fee', 'lainnya'] as const;

const putSchema = z.object({
  jenis_tagihan: z.enum(JENIS, { message: 'Jenis tagihan tidak valid.' }).optional(),
  tagihan: optNum,
  sudah_bayar: optNum,
  metode: optText,
  tanggal: optDate,
  keterangan: optText,
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('payments')
    .select('*, customers(nama_lengkap), units(kode_kavling)')
    .eq('id', Number(id))
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Pembayaran tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, putSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;

  // TIDAK mengubah bukti & mutasi saldo pada edit (kebijakan modul).
  const update: Record<string, unknown> = {};
  if (d.jenis_tagihan !== undefined) update.jenis_tagihan = d.jenis_tagihan;
  if (d.tagihan !== undefined) update.tagihan = d.tagihan;
  if (d.sudah_bayar !== undefined) update.sudah_bayar = d.sudah_bayar;
  if (d.metode !== undefined) update.metode = d.metode;
  if (d.tanggal !== undefined) update.tanggal = d.tanggal;
  if (d.keterangan !== undefined) update.keterangan = d.keterangan;

  const { data, error } = await supabaseAdmin()
    .from('payments')
    .update(update)
    .eq('id', Number(id))
    .select()
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Pembayaran tidak ditemukan.', 404);

  await logActivity(auth.user.id, `edit pembayaran #${id}`, 'payments', Number(id));
  return ok(data);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('payments')
    .delete()
    .eq('id', Number(id))
    .select('id')
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Pembayaran tidak ditemukan.', 404);

  await logActivity(auth.user.id, `hapus pembayaran #${id}`, 'payments', Number(id));
  return ok({ deleted: true });
}
