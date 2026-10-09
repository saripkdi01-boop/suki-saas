import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/master/kavling';
const TABLE = 'units';

const numNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nullable()
);
const fkOpt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().int().nullable()
);

const schema = z.object({
  location_id: z.preprocess((v) => Number(v), z.number().int().positive()),
  kode_kavling: z.string().trim().min(1, 'Kode kavling wajib diisi.').max(30, 'Maksimal 30 karakter.'),
  pjg_kanan: numNull,
  pjg_kiri: numNull,
  lbr_depan: numNull,
  lbr_belakang: numNull,
  luas_tanah: numNull,
  luas_bangunan: numNull,
  harga_jual: numNull,
  daya_listrik: z.string().trim().max(20).optional().or(z.literal('')),
  no_sertifikat: z.string().trim().max(50).optional().or(z.literal('')),
  keterangan: z.string().trim().max(1000).optional().or(z.literal('')),
  status_id: fkOpt,
  progres_bangunan: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().int().min(0).max(100)
  ),
  is_ready: z.boolean().optional(),
  listrik_terpasang: z.boolean().optional(),
  air_terpasang: z.boolean().optional(),
});

type Input = z.infer<typeof schema>;

function clean(d: Input) {
  const s = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null);
  return {
    location_id: d.location_id,
    kode_kavling: d.kode_kavling.trim().toUpperCase(),
    pjg_kanan: d.pjg_kanan,
    pjg_kiri: d.pjg_kiri,
    lbr_depan: d.lbr_depan,
    lbr_belakang: d.lbr_belakang,
    luas_tanah: d.luas_tanah,
    luas_bangunan: d.luas_bangunan,
    harga_jual: d.harga_jual,
    daya_listrik: s(d.daya_listrik),
    no_sertifikat: s(d.no_sertifikat),
    keterangan: s(d.keterangan),
    status_id: d.status_id,
    progres_bangunan: d.progres_bangunan ?? 0,
    is_ready: d.is_ready ?? false,
    listrik_terpasang: d.listrik_terpasang ?? false,
    air_terpasang: d.air_terpasang ?? false,
  };
}

function friendly(error: { code?: string; message: string }) {
  if (error.code === '23505') return err('DUPLICATE', 'Kode kavling sudah dipakai di lokasi ini.', 409);
  return err('DB_ERROR', error.message, 500);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if (parsed instanceof Response) return parsed;
  const { data, error } = await supabaseAdmin().from(TABLE).update(clean(parsed.data)).eq('id', id).select().single();
  if (error) return friendly(error);
  await logActivity(auth.user.id, `edit kavling #${id}: ${parsed.data.kode_kavling}`, TABLE, Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  // soft delete — data transaksi unit bersifat penting
  const { error } = await supabaseAdmin().from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus kavling #${id}`, TABLE, Number(id));
  return ok({ message: 'Dihapus.' });
}
