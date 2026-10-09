import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/customer/customer';
const TABLE = 'customers';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

export const customerSchema = z.object({
  nama_lengkap: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(200, 'Maksimal 200 karakter.'),
  nik: optText,
  no_hp: optText,
  tempat_lahir: optText,
  tgl_lahir: optDate,
  jenis_kelamin: z.preprocess(emptyToUndef, z.enum(['L', 'P']).optional()),
  alamat_ktp: optText,
  alamat_domisili: optText,
  npwp: optText,
  jenis_pembelian: z.preprocess(emptyToUndef, z.enum(['KPR', 'Cash']).default('KPR')),
  marketing_id: optId,
  admin_id: optId,
  unit_id: optId,
  status_id: optId,
});

/** Validasi FK opsional: bila diisi, baris rujukan harus ada. */
async function validateFk(parsed: Record<string, unknown>): Promise<Response | null> {
  const refs: Array<[string, string, string]> = [
    ['marketing_id', 'marketing', 'Marketing'],
    ['admin_id', 'admin_staff', 'Admin pemberkasan'],
    ['unit_id', 'units', 'Unit'],
    ['status_id', 'unit_statuses', 'Status'],
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

const LIST_SELECT =
  'id, nama_lengkap, no_hp, jenis_pembelian, marketing_id, admin_id, unit_id, status_id, ' +
  'units(kode_kavling), unit_statuses(nama, warna_hex), marketing(nama)';

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from(TABLE)
    .select(LIST_SELECT, { count: 'exact' })
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
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
  const parsed = await parseBody(req, customerSchema);
  if (parsed instanceof Response) return parsed;
  const fkErr = await validateFk(parsed.data as unknown as Record<string, unknown>);
  if (fkErr) return fkErr;
  const { data, error } = await supabaseAdmin().from(TABLE).insert(parsed.data).select('id').single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `tambah customer: ${parsed.data.nama_lengkap}`, TABLE, data.id);
  return ok(data, undefined, 201);
}
