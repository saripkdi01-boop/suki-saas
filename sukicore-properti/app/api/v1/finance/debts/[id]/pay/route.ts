import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/keuangan/hutang';

const paySchema = z.object({
  jumlah: z.preprocess((v) => Number(v), z.number().positive('Jumlah bayar harus lebih dari 0.')),
});

/** Catat pembayaran hutang: sudah_bayar += jumlah; lunas bila sisa 0. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, paySchema);
  if (parsed instanceof Response) return parsed;
  const db = supabaseAdmin();
  const { data: row, error: fetchErr } = await db.from('debts').select('*').eq('id', id).single();
  if (fetchErr || !row) return err('NOT_FOUND', 'Data hutang tidak ditemukan.', 404);
  const sudahBayar = Number(row.sudah_bayar);
  const total = Number(row.jumlah);
  const sisa = total - sudahBayar;
  if (sisa <= 0) return err('VALIDATION', 'Hutang ini sudah lunas.', 422);
  if (parsed.data.jumlah > sisa) {
    return err('VALIDATION', `Jumlah bayar melebihi sisa hutang (Rp${Math.round(sisa).toLocaleString('id-ID')}).`, 422);
  }
  const baru = sudahBayar + parsed.data.jumlah;
  const { data, error } = await db
    .from('debts')
    .update({ sudah_bayar: baru, status: baru >= total ? 'lunas' : 'belum_lunas' })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `bayar hutang #${id} (${row.pihak}) Rp${parsed.data.jumlah}`, 'debts', Number(id));
  return ok(data);
}
