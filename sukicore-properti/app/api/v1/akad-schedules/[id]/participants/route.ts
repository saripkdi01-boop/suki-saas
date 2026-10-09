import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';

const MENU = '/admin/transaksi/akad';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));

const bodySchema = z.object({ customer_id: reqId });

const SELECT =
  'id, akad_schedule_id, customer_id, customers!inner(id, nama_lengkap, units(kode_kavling))';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('akad_participants')
    .select(SELECT)
    .eq('akad_schedule_id', id)
    .order('id');
  if (error) return err('DB_ERROR', error.message, 500);
  return ok(data ?? []);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, bodySchema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: schedule } = await db.from('akad_schedules').select('id').eq('id', id).maybeSingle();
  if (!schedule) return err('NOT_FOUND', 'Jadwal akad tidak ditemukan.', 404);

  const { data: dup } = await db
    .from('akad_participants')
    .select('id')
    .eq('akad_schedule_id', id)
    .eq('customer_id', parsed.data.customer_id)
    .maybeSingle();
  if (dup) return err('DUPLICATE', 'Customer sudah terdaftar di jadwal ini.', 409);

  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', parsed.data.customer_id)
    .maybeSingle();
  if (!customer) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);
  const unitId = customer.unit_id as number | null;
  if (!unitId) return err('NO_UNIT', 'Customer tidak memiliki unit.', 422);

  // Ubah status unit ke Akad dulu; gagal → 422, belum ada peserta yang disimpan
  const r = await changeUnitStatus({
    unitId,
    toStatusName: 'Akad',
    userId: auth.user.id,
    isSuperadmin: auth.user.role === 'SUPERADMIN',
    customerId: customer.id as number,
  });
  if (!r.ok) return err('STATUS_TRANSITION', r.error ?? 'Gagal ubah status unit.', 422);

  const { data, error } = await db
    .from('akad_participants')
    .insert({ akad_schedule_id: Number(id), customer_id: parsed.data.customer_id })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return err('DUPLICATE', 'Customer sudah terdaftar di jadwal ini.', 409);
    return err('DB_ERROR', error.message, 500);
  }
  await logActivity(
    auth.user.id,
    `tambah peserta akad #${id}: ${customer.nama_lengkap as string}`,
    'akad_participants',
    data.id
  );
  return ok(data, undefined, 201);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const customerId = new URL(req.url).searchParams.get('customer_id');
  if (!customerId) return err('VALIDATION', 'customer_id wajib diisi.', 422);

  const { error } = await supabaseAdmin()
    .from('akad_participants')
    .delete()
    .eq('akad_schedule_id', id)
    .eq('customer_id', customerId);
  if (error) return err('DB_ERROR', error.message, 500);
  // Status unit sengaja TIDAK dikembalikan — dicatat di sini untuk laporan/audit.
  await logActivity(
    auth.user.id,
    `hapus peserta akad #${id} (customer #${customerId}; status unit tidak dikembalikan)`,
    'akad_participants',
    Number(customerId)
  );
  return ok({ message: 'Dihapus.' });
}
