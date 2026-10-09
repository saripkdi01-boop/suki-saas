import { z } from 'zod';
import { getSessionUser, changePassword } from '@/lib/auth';
import { err, ok, parseBody } from '@/lib/api';

const schema = z.object({
  oldPassword: z.string().min(1, 'Password lama wajib diisi.'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.').max(100),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return err('UNAUTHORIZED', 'Belum login.', 401);
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const res = await changePassword(user.id, parsed.data.oldPassword, parsed.data.newPassword);
  if (!res.ok) return err('CHANGE_FAILED', res.error ?? 'Gagal.', 400);
  return ok({ message: 'Password berhasil diganti.' });
}
