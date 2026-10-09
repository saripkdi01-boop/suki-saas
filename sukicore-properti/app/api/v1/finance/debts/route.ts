import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/keuangan/hutang';

const optText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(500).nullable().optional()
);

export const debtSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  pihak: z.string().trim().min(1, 'Pihak wajib diisi.').max(200),
  jumlah: z.preprocess((v) => Number(v), z.number().positive('Jumlah harus lebih dari 0.')),
  sudah_bayar: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().min(0, 'Sudah bayar tidak boleh negatif.')
  ),
  status: z.enum(['belum_lunas', 'lunas']).default('belum_lunas'),
  keterangan: optText,
});

export type DebtInput = z.infer<typeof debtSchema>;

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('debts')
    .select('*', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('pihak', `%${q}%`);
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
  const parsed = await parseBody(req, debtSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  if (d.sudah_bayar > d.jumlah) return err('VALIDATION', 'Sudah bayar tidak boleh melebihi jumlah hutang.', 422);
  const { data, error } = await supabaseAdmin()
    .from('debts')
    .insert({
      tanggal: d.tanggal,
      pihak: d.pihak,
      jumlah: d.jumlah,
      sudah_bayar: d.sudah_bayar,
      status: d.sudah_bayar >= d.jumlah ? 'lunas' : d.status,
      keterangan: d.keterangan ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah hutang ke ${d.pihak} Rp${d.jumlah}`, 'debts', data.id);
  return ok(data, undefined, 201);
}
