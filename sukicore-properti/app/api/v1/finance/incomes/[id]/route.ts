import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { incomeSchema, syncIncomeMutation } from '../route';

const MENU = '/admin/keuangan/pemasukan';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, incomeSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  const { data, error } = await supabaseAdmin()
    .from('incomes')
    .update({
      tanggal: d.tanggal,
      kategori_id: d.kategori_id,
      rekening_id: d.rekening_id,
      customer_id: d.customer_id,
      jumlah: d.jumlah,
      keterangan: d.keterangan ?? null,
      bukti_url: d.bukti_url ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await syncIncomeMutation(Number(id), { tanggal: d.tanggal, rekening_id: d.rekening_id, jumlah: d.jumlah, keterangan: d.keterangan });
  await logActivity(auth.user.id, `edit pemasukan #${id}`, 'incomes', Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  await db.from('balance_mutations').delete().eq('ref_tabel', 'incomes').eq('ref_id', Number(id));
  const { error } = await db.from('incomes').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus pemasukan #${id}`, 'incomes', Number(id));
  return ok({ message: 'Dihapus.' });
}
