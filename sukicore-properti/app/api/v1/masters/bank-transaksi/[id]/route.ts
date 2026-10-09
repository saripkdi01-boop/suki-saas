import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/bank-transaksi';
const TABLE = 'bank_transaksi';

const schema = z.object({
  nama_bank: z.string().trim().min(1, 'Nama bank wajib diisi.').max(50, 'Maksimal 50 karakter.'),
  no_rekening: z.string().trim().min(1, 'No. rekening wajib diisi.').max(30, 'Maksimal 30 karakter.'),
  atas_nama: z.string().trim().max(100).optional().or(z.literal('')),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  return {
    nama_bank: d.nama_bank.trim(),
    no_rekening: d.no_rekening.trim(),
    atas_nama: d.atas_nama && d.atas_nama.trim() !== '' ? d.atas_nama.trim() : null,
  };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).update(clean(parsed.data)).eq('id', id).select().single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit rekening #${id}: ${parsed.data.nama_bank} ${parsed.data.no_rekening}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { error } = await supabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus rekening #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
