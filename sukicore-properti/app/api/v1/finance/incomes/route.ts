import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/keuangan/pemasukan';

const optId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().int().positive().nullable()
);
const optText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(500).nullable().optional()
);

export const incomeSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  kategori_id: optId,
  rekening_id: optId,
  customer_id: optId,
  jumlah: z.preprocess((v) => Number(v), z.number().positive('Jumlah harus lebih dari 0.')),
  keterangan: optText,
  bukti_url: optText,
});

export type IncomeInput = z.infer<typeof incomeSchema>;

/** Sinkronkan mutasi saldo: ada bila rekening diisi, hapus bila rekening dikosongkan. */
export async function syncIncomeMutation(
  incomeId: number,
  d: { tanggal: string; rekening_id: number | null; jumlah: number; keterangan?: string | null }
): Promise<void> {
  const db = supabaseAdmin();
  const { data: ex } = await db
    .from('balance_mutations')
    .select('id')
    .eq('ref_tabel', 'incomes')
    .eq('ref_id', incomeId)
    .maybeSingle();
  if (!d.rekening_id) {
    if (ex) await db.from('balance_mutations').delete().eq('id', (ex as { id: number }).id);
    return;
  }
  const payload = {
    tanggal: d.tanggal,
    rekening_id: d.rekening_id,
    tipe: 'masuk',
    jumlah: d.jumlah,
    keterangan: d.keterangan ?? null,
    ref_tabel: 'incomes',
    ref_id: incomeId,
  };
  if (ex) await db.from('balance_mutations').update(payload).eq('id', (ex as { id: number }).id);
  else await db.from('balance_mutations').insert(payload);
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('incomes')
    .select('*, finance_categories(nama), bank_transaksi(nama_bank, no_rekening), customers(nama_lengkap)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('keterangan', `%${q}%`);
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
  const parsed = await parseBody(req, incomeSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  const { data, error } = await supabaseAdmin()
    .from('incomes')
    .insert({
      tanggal: d.tanggal,
      kategori_id: d.kategori_id,
      rekening_id: d.rekening_id,
      customer_id: d.customer_id,
      jumlah: d.jumlah,
      keterangan: d.keterangan ?? null,
      bukti_url: d.bukti_url ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await syncIncomeMutation(data.id, { tanggal: d.tanggal, rekening_id: d.rekening_id, jumlah: d.jumlah, keterangan: d.keterangan });
  await logActivity(auth.user.id, `tambah pemasukan Rp${d.jumlah} (${d.tanggal})`, 'incomes', data.id);
  return ok(data, undefined, 201);
}
