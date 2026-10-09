import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { receivableSchema } from '../route';

const MENU = '/admin/keuangan/piutang';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, receivableSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  if (d.sudah_bayar > d.jumlah) return err('VALIDATION', 'Sudah bayar tidak boleh melebihi jumlah piutang.', 422);
  const { data, error } = await supabaseAdmin()
    .from('receivables')
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
  await logActivity(auth.user.id, `edit piutang #${id} (${d.pihak})`, 'receivables', Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from('receivables').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus piutang #${id}`, 'receivables', Number(id));
  return ok({ message: 'Dihapus.' });
}
