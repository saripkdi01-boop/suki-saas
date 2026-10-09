import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/bank-transaksi';
const TABLE = 'bank_transaksi';

const schema = z.object({
  nama_bank: z.string().trim().min(1, 'Nama bank wajib diisi.').max(50, 'Maksimal 50 karakter.'),
  no_rekening: z.string().trim().min(1, 'No. rekening wajib diisi.').max(30, 'Maksimal 30 karakter.'),
  atas_nama: z.string().trim().max(100).optional().or(z.literal('')),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  return {
    nama_bank: d.nama_bank.trim(),
    no_rekening: d.no_rekening.trim(),
    atas_nama: d.atas_nama && d.atas_nama.trim() !== '' ? d.atas_nama.trim() : null,
  };
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select('*', { count: 'exact' }).order('nama_bank');
  if (q) query = query.or(`nama_bank.ilike.%${q}%,no_rekening.ilike.%${q}%`);
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
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(clean(parsed.data)).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah rekening: ${parsed.data.nama_bank} ${parsed.data.no_rekening}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
