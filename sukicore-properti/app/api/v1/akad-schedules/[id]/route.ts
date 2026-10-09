import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/transaksi/akad';

const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());

const schema = z.object({
  tanggal: z
    .string()
    .trim()
    .min(1, 'Tanggal wajib diisi.')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid.'),
  keterangan: optText,
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('akad_schedules')
    .select('id, tanggal, keterangan, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Jadwal akad tidak ditemukan.', 404);
  return ok(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;

  const { data, error } = await supabaseAdmin()
    .from('akad_schedules')
    .update({
      tanggal: parsed.data.tanggal,
      keterangan: parsed.data.keterangan ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `edit jadwal akad #${id} (${parsed.data.tanggal})`, 'akad_schedules', Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  // Hapus peserta jadwal ini dulu (FK tanpa cascade), lalu jadwalnya
  const { error: partErr } = await db.from('akad_participants').delete().eq('akad_schedule_id', id);
  if (partErr) return err('DB_ERROR', partErr.message, 500);
  const { error } = await db.from('akad_schedules').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus jadwal akad #${id} beserta pesertanya`, 'akad_schedules', Number(id));
  return ok({ message: 'Dihapus.' });
}
