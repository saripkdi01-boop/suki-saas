import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/barang-keluar';

const optText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(1000).nullable().optional()
);

const issueItemSchema = z.object({
  barang_id: z.preprocess((v) => Number(v), z.number().int().positive('Barang wajib dipilih.')),
  kode: z.string().trim().max(50),
  nama: z.string().trim().max(200),
  qty: z.preprocess((v) => Number(v), z.number().positive('Qty harus lebih dari 0.')),
  satuan: z.string().trim().max(20).default(''),
});

const issueSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  tujuan: z.string().trim().min(1, 'Tujuan wajib diisi.').max(200),
  items: z.array(issueItemSchema).min(1, 'Harus ada minimal 1 item.'),
  keterangan: optText,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('goods_issues')
    .select('*', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('tujuan', `%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

/** Keluarkan barang: validasi stok cukup, lalu kurangi stok. */
export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, issueSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  const db = supabaseAdmin();

  const ids = [...new Set(d.items.map((i) => i.barang_id))];
  const { data: barangs } = await db.from('items').select('id, kode, nama, stok').in('id', ids);
  const stokMap = new Map<number, { stok: number; nama: string }>();
  for (const b of (barangs ?? []) as Array<{ id: number; kode: string; nama: string; stok: number }>) {
    stokMap.set(b.id, { stok: Number(b.stok), nama: `${b.kode} - ${b.nama}` });
  }
  for (const it of d.items) {
    const cur = stokMap.get(it.barang_id);
    if (!cur) return err('VALIDATION', `Barang ${it.kode} tidak ditemukan di master.`, 422);
    if (cur.stok < it.qty) {
      return err('VALIDATION', `Stok ${cur.nama} tidak mencukupi (tersedia ${cur.stok}, diminta ${it.qty}).`, 422);
    }
  }
  for (const it of d.items) {
    const cur = stokMap.get(it.barang_id)!;
    const { error } = await db.from('items').update({ stok: cur.stok - it.qty }).eq('id', it.barang_id);
    if (error) return err('DB_ERROR', `Gagal mengurangi stok: ${error.message}`, 500);
  }

  const { data, error } = await db
    .from('goods_issues')
    .insert({ tanggal: d.tanggal, tujuan: d.tujuan, items: d.items, keterangan: d.keterangan ?? null })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `barang keluar ke ${d.tujuan} (${d.items.length} item)`, 'goods_issues', data.id);
  return ok(data, undefined, 201);
}
