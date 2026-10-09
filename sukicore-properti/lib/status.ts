import { supabaseAdmin } from './supabase';
import { logActivity } from './activity';

/**
 * State machine status unit. Transisi legal antar status penjualan.
 * Kunci = nama status asal, nilai = daftar nama status tujuan yang diizinkan.
 */
export const TRANSITIONS: Record<string, string[]> = {
  Ready: ['Booking', 'Booking Fee', 'Pembelian Cash'],
  Booking: ['Booking Fee', 'User Cancel'],
  'Booking Fee': ['On Proses Bank', 'User Cancel'],
  'On Proses Bank': ['SP3K', 'User Cancel'],
  SP3K: ['Akad', 'User Cancel'],
  Akad: ['Serah Terima', 'User Cancel'],
  'Pembelian Cash': ['Serah Terima', 'User Cancel'],
  'Serah Terima': [],
  'User Cancel': [],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transisi operasional: perubahan status yang SAH sebagai bagian dari operasi
 * bisnis bernama (bukan alur penjualan normal), sehingga tidak mengikuti
 * TRANSITIONS. Berlaku untuk role apa pun yang lolos izin menu operasinya,
 * dengan alasan wajib + pencatatan transparan di activity_logs.
 */
const OPERATIONAL_TRANSITIONS: Record<string, { from: string[]; to: string; label: string }> = {
  'pindah-unit': {
    from: ['Booking', 'Booking Fee', 'On Proses Bank', 'SP3K', 'Akad'],
    to: 'Ready',
    label: 'Pindah unit: unit lama dikembalikan menjadi Ready',
  },
};

export async function getStatusIdByName(nama: string): Promise<number | null> {
  const { data } = await supabaseAdmin()
    .from('unit_statuses')
    .select('id')
    .eq('nama', nama)
    .maybeSingle();
  return (data?.id as number) ?? null;
}

/**
 * Ubah status unit dengan penegakan state machine.
 * SUPERADMIN boleh override dengan alasan tertulis.
 */
export async function changeUnitStatus(opts: {
  unitId: number;
  toStatusName: string;
  userId: number;
  isSuperadmin: boolean;
  reason?: string;
  customerId?: number;
  /** Nama operasi bisnis untuk transisi operasional (lihat OPERATIONAL_TRANSITIONS). */
  operation?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { unitId, toStatusName, userId, isSuperadmin, reason, customerId, operation } = opts;
  const db = supabaseAdmin();

  const { data: unit } = await db
    .from('units')
    .select('id, kode_kavling, status_id, unit_statuses!inner(nama)')
    .eq('id', unitId)
    .maybeSingle();
  if (!unit) return { ok: false, error: 'Unit tidak ditemukan.' };
  const fromName = (unit.unit_statuses as unknown as { nama: string }).nama;

  const toId = await getStatusIdByName(toStatusName);
  if (!toId) return { ok: false, error: `Status "${toStatusName}" tidak dikenal.` };

  let viaOperation: string | null = null;
  const legal = canTransition(fromName, toStatusName);
  if (!legal) {
    // 1) Coba jalur transisi operasional (jujur, tercatat, tanpa klaim superadmin)
    if (operation) {
      const op = OPERATIONAL_TRANSITIONS[operation];
      if (!op || op.to !== toStatusName || !op.from.includes(fromName)) {
        return { ok: false, error: `Operasi "${operation}" tidak mengizinkan transisi ${fromName} → ${toStatusName}.` };
      }
      if (!reason || reason.trim().length < 5) {
        return { ok: false, error: 'Transisi operasional wajib disertai alasan (min. 5 karakter).' };
      }
      viaOperation = operation;
    } else if (!isSuperadmin) {
      return { ok: false, error: `Transisi ${fromName} → ${toStatusName} tidak diizinkan.` };
    } else {
      // 2) Override SUPERADMIN asli
      if (!reason || reason.trim().length < 5) {
        return { ok: false, error: 'Override SUPERADMIN wajib disertai alasan (min. 5 karakter).' };
      }
    }
  }

  const { error } = await db.from('units').update({ status_id: toId }).eq('id', unitId);
  if (error) return { ok: false, error: error.message };

  if (customerId) {
    await db.from('customers').update({ status_id: toId }).eq('id', customerId);
  }

  await logActivity(userId, `ubah status unit ${unit.kode_kavling}: ${fromName} → ${toStatusName}`, 'units', unitId, {
    from: fromName,
    to: toStatusName,
    override: !legal && !viaOperation,
    operation: viaOperation,
    reason: reason ?? null,
    customer_id: customerId ?? null,
  });

  return { ok: true };
}
