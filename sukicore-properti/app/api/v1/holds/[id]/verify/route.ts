import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { changeUnitStatus } from '@/lib/status';

const MENU = '/admin/pengajuan-hold';

const verifySchema = z.object({ approve: z.boolean() });

/**
 * Verifikasi pengajuan hold. Setujui → status unit berubah ke "Booking" (via state machine);
 * tolak → pengajuan menjadi rejected tanpa mengubah unit.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const parsed = await parseBody(req, verifySchema);
  if (parsed instanceof Response) return parsed;

  const db = supabaseAdmin();
  const { data: hold, error: hErr } = await db
    .from('hold_requests')
    .select('id, unit_id, customer_id, status')
    .eq('id', Number(id))
    .maybeSingle();
  if (hErr) return err('DB_ERROR', hErr.message, 500);
  if (!hold) return err('NOT_FOUND', 'Pengajuan hold tidak ditemukan.', 404);
  if (hold.status !== 'pending') return err('INVALID_STATE', 'Pengajuan sudah diverifikasi.', 422);

  let data;
  if (parsed.data.approve) {
    const r = await changeUnitStatus({
      unitId: hold.unit_id,
      toStatusName: 'Booking',
      userId: auth.user.id,
      isSuperadmin: auth.user.role === 'SUPERADMIN',
      customerId: hold.customer_id ?? undefined,
    });
    if (!r.ok) return err('STATUS_TRANSITION', r.error ?? 'Gagal ubah status unit.', 422);
    const { data: upd, error: uErr } = await db
      .from('hold_requests')
      .update({ status: 'approved' })
      .eq('id', hold.id)
      .select()
      .single();
    if (uErr) return err('DB_ERROR', uErr.message, 500);
    data = upd;
  } else {
    const { data: upd, error: uErr } = await db
      .from('hold_requests')
      .update({ status: 'rejected' })
      .eq('id', hold.id)
      .select()
      .single();
    if (uErr) return err('DB_ERROR', uErr.message, 500);
    data = upd;
  }

  await logActivity(
    auth.user.id,
    `verifikasi hold #${hold.id}: ${parsed.data.approve ? 'disetujui' : 'ditolak'}`,
    'hold_requests',
    hold.id
  );
  return ok(data);
}
