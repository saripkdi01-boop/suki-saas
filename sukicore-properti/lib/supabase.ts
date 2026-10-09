import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Supabase client dengan service_role — HANYA dipakai di server
 * (Server Components, Route Handlers, Server Actions).
 * Jangan pernah expose ke client component.
 */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local lalu jalankan supabase/migrations/*.sql di SQL Editor.'
    );
  }
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/** Cek koneksi DB — untuk halaman status/setup. */
export async function checkDb(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin().from('app_settings').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Bucket storage yang dipakai aplikasi. */
export const STORAGE_BUCKETS = [
  'app-media', // logo, favicon, background
  'unit-foto', // foto kavling/unit
  'bukti-bayar', // bukti pembayaran / transfer
  'lampiran', // lampiran hold, file customer, dsb
] as const;
