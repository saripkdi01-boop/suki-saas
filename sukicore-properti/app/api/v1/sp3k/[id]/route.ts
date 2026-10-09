import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/acc-bank';

const SELECT =
  'id, customer_id, tanggal_pencairan, nominal, bank_kpr_id, keterangan, customers(id, nama_lengkap), bank_kpr(nama)';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from('sp3k_records').select(SELECT).eq('id', id).maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Data SP3K tidak ditemukan.', 404);
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('sp3k_records')
    .select('id, customers(nama_lengkap)')
    .eq('id', id)
    .maybeSingle();
  const { error } = await db.from('sp3k_records').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  const nama = (row?.customers as unknown as { nama_lengkap?: string } | null)?.nama_lengkap ?? `#${id}`;
  // Status unit sengaja TIDAK dikembalikan — dicatat di sini untuk laporan/audit.
  await logActivity(
    auth.user.id,
    `hapus catatan SP3K #${id} customer ${nama} (status unit tidak dikembalikan)`,
    'sp3k_records',
    Number(id)
  );
  return ok({ message: 'Dihapus.' });
}
