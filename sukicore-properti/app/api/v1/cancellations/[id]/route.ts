import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/pembelian-cancel';
const TABLE = 'cancellations';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select('*, customer:customers(nama_lengkap), unit:units(kode_kavling)')
    .eq('id', id)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Data tidak ditemukan.', 404);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus riwayat cancel pembelian #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
