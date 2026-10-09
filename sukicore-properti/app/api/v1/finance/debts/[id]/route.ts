import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { debtSchema } from '../route';

const MENU = '/admin/keuangan/hutang';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, debtSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  if (d.sudah_bayar > d.jumlah) return err('VALIDATION', 'Sudah bayar tidak boleh melebihi jumlah hutang.', 422);
  const { data, error } = await supabaseAdmin()
    .from('debts')
    .update({
      tanggal: d.tanggal,
      pihak: d.pihak,
      jumlah: d.jumlah,
      sudah_bayar: d.sudah_bayar,
      status: d.sudah_bayar >= d.jumlah ? 'lunas' : d.status,
      keterangan: d.keterangan ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit hutang #${id} (${d.pihak})`, 'debts', Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from('debts').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus hutang #${id}`, 'debts', Number(id));
  return ok({ message: 'Dihapus.' });
}
