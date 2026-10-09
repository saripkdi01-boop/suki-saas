import { logoutUser } from '@/lib/auth';
import { ok } from '@/lib/api';

export async function POST() {
  await logoutUser();
  return ok({ message: 'Berhasil keluar.' });
}
