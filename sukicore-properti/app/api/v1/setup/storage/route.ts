import { supabaseAdmin, STORAGE_BUCKETS } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

/**
 * Inisialisasi bucket storage sekali pakai.
 * Hanya SUPERADMIN — dicek manual via role, bukan via matriks menu.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return err('UNAUTHORIZED', 'Belum login.', 401);
  if (user.role !== 'SUPERADMIN') {
    return err('FORBIDDEN', 'Hanya SUPERADMIN yang boleh inisialisasi storage.', 403);
  }

  const db = supabaseAdmin();
  const created: string[] = [];
  for (const bucket of STORAGE_BUCKETS) {
    const { error } = await db.storage.createBucket(bucket, { public: true });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      return err('STORAGE_ERROR', `Gagal membuat bucket ${bucket}: ${error.message}`, 500);
    }
    created.push(bucket);
  }
  await logActivity(user.id, 'inisialisasi storage buckets', 'storage');
  return ok({ buckets: created });
}
