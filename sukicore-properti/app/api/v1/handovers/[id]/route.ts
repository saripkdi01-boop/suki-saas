import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { storagePathFromUrl } from '@/lib/upload';

const MENU = '/admin/customer/serah-terima-kunci';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('handovers')
    .select('id, customer_id, unit_id, tanggal, catatan, bukti_url, created_at, customers(nama_lengkap), units(kode_kavling)')
    .eq('id', id)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Data serah terima tidak ditemukan.', 404);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: row } = await db.from('handovers').select('id, bukti_url').eq('id', id).maybeSingle();
  if (!row) return err('NOT_FOUND', 'Data serah terima tidak ditemukan.', 404);

  const bukti = row.bukti_url as string | null;
  if (bukti) {
    const p = storagePathFromUrl('lampiran', bukti);
    if (p) {
      try {
        await db.storage.from('lampiran').remove([p]);
      } catch {
        // abaikan kegagalan hapus file storage
      }
    }
  }

  const { error } = await db.from('handovers').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(auth.user.id, 'hapus serah terima kunci', 'handovers', Number(id));
  return ok({ message: 'Dihapus.' });
}
