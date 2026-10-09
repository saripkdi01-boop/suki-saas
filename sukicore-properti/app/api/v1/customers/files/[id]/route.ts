import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { storagePathFromUrl } from '@/lib/upload';

const MENU = '/admin/customer/upload-file';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: row } = await db.from('customer_files').select('id, file_url').eq('id', id).maybeSingle();
  if (!row) return err('NOT_FOUND', 'File tidak ditemukan.', 404);

  const p = storagePathFromUrl('lampiran', row.file_url as string);
  if (p) {
    try {
      await db.storage.from('lampiran').remove([p]);
    } catch {
      // abaikan kegagalan hapus file storage
    }
  }

  const { error } = await db.from('customer_files').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, 'hapus file customer', 'customer_files', Number(id));
  return ok({ message: 'Dihapus.' });
}
