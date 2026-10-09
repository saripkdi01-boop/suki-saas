import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { expenseSchema, syncExpenseMutation } from '../route';

const MENU = '/admin/keuangan/pengeluaran';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, expenseSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  const { data, error } = await supabaseAdmin()
    .from('expenses')
    .update({
      tanggal: d.tanggal,
      kategori_id: d.kategori_id,
      rekening_id: d.rekening_id,
      jumlah: d.jumlah,
      keterangan: d.keterangan ?? null,
      bukti_url: d.bukti_url ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await syncExpenseMutation(Number(id), { tanggal: d.tanggal, rekening_id: d.rekening_id, jumlah: d.jumlah, keterangan: d.keterangan });
  await logActivity(auth.user.id, `edit pengeluaran #${id}`, 'expenses', Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  await db.from('balance_mutations').delete().eq('ref_tabel', 'expenses').eq('ref_id', Number(id));
  const { error } = await db.from('expenses').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus pengeluaran #${id}`, 'expenses', Number(id));
  return ok({ message: 'Dihapus.' });
}
