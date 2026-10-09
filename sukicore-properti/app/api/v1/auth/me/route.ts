import { getSessionUser } from '@/lib/auth';
import { err, ok } from '@/lib/api';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return err('UNAUTHORIZED', 'Belum login.', 401);
  return ok(user);
}
