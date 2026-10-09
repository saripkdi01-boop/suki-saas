import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/customer/prospek';
const TABLE = 'prospects';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

export const prospekSchema = z.object({
  nama_lengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(200, 'Maksimal 200 karakter.'),
  no_hp: optText,
  alamat: optText,
  sumber: optText,
  location_id: optId,
  marketing_id: optId,
  status: z.preprocess(emptyToUndef, z.enum(['baru', 'follow_up', 'deal', 'batal']).default('baru')),
});

async function validateFk(parsed: Record<string, unknown>): Promise<Response | null> {
  const refs: Array<[string, string, string]> = [
    ['location_id', 'locations', 'Lokasi'],
    ['marketing_id', 'marketing', 'Marketing'],
  ];
  const db = supabaseAdmin();
  for (const [key, table, label] of refs) {
    const id = parsed[key] as number | undefined;
    if (id === undefined) continue;
    const { data } = await db.from(table).select('id').eq('id', id).maybeSingle();
    if (!data) return err('FK_INVALID', `${label} #${id} tidak ditemukan.`, 422);
  }
  return null;
}

const LIST_SELECT = 'id, nama_lengkap, no_hp, alamat, sumber, status, location_id, marketing_id, locations(nama), marketing(nama)';

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin().from(TABLE).select(LIST_SELECT, { count: 'exact' }).order('nama_lengkap');
  if (q) query = query.ilike('nama_lengkap', `%${q}%`);
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
  const parsed = await parseBody(req, prospekSchema);
  if (parsed instanceof Response) return parsed;
  const fkErr = await validateFk(parsed.data as unknown as Record<string, unknown>);
  if (fkErr) return fkErr;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(parsed.data).select('id').single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah prospek: ${parsed.data.nama_lengkap}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
