import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/akad';

const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  tanggal: z
    .string()
    .trim()
    .min(1, 'Tanggal wajib diisi.')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid.'),
  keterangan: optText,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('akad_schedules')
    .select('id, tanggal, keterangan, created_at', { count: 'exact' })
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
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const { data, error } = await supabaseAdmin()
    .from('akad_schedules')
    .insert({
      tanggal: parsed.data.tanggal,
      keterangan: parsed.data.keterangan ?? null,
    })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah jadwal akad (${parsed.data.tanggal})`, 'akad_schedules', data.id);
  return ok(data, undefined, 201);
}
