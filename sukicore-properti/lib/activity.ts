import { supabaseAdmin } from './supabase';

/** Catat aktivitas ke activity_logs. Gagal catat tidak boleh menggagalkan aksi utama. */
export async function logActivity(
  userId: number | null,
  aksi: string,
  tabelRef?: string,
  recordId?: number,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin().from('activity_logs').insert({
      user_id: userId,
      aksi,
      tabel_ref: tabelRef ?? null,
      record_id: recordId ?? null,
      detail: detail ?? null,
    });
  } catch {
    // abaikan — logging tidak boleh memblokir alur utama
  }
}
