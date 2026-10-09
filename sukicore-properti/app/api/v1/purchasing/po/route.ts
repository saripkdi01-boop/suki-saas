import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/pembelian/input-po';

const optId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().int().positive().nullable()
);
const optText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(1000).nullable().optional()
);

export const poItemSchema = z.object({
  barang_id: z.preprocess((v) => Number(v), z.number().int().positive('Barang wajib dipilih.')),
  kode: z.string().trim().max(50),
  nama: z.string().trim().max(200),
  qty: z.preprocess((v) => Number(v), z.number().positive('Qty harus lebih dari 0.')),
  satuan: z.string().trim().max(20).default(''),
  harga: z.preprocess((v) => Number(v), z.number().min(0, 'Harga tidak boleh negatif.')),
});

export const poSchema = z.object({
  no_po: z.string().trim().min(1, 'No. PO wajib diisi.').max(50),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  supplier_id: optId,
  items: z.array(poItemSchema).min(1, 'PO harus memiliki minimal 1 item.'),
  keterangan: optText,
});

export type POInput = z.infer<typeof poSchema>;
export type POItem = z.infer<typeof poItemSchema>;

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('purchase_orders')
    .select('*, suppliers(nama)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('no_po', `%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, poSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;

  // Validasi barang_id benar-benar ada
  const db = supabaseAdmin();
  const ids = [...new Set(d.items.map((i) => i.barang_id))];
  const { data: barangs } = await db.from('items').select('id').in('id', ids);
  if ((barangs ?? []).length !== ids.length) {
    return err('VALIDATION', 'Ada barang pada PO yang tidak ditemukan di master barang.', 422);
  }

  const total = d.items.reduce((s, i) => s + i.qty * i.harga, 0);
  const { data, error } = await db
    .from('purchase_orders')
    .insert({
      no_po: d.no_po,
      tanggal: d.tanggal,
      supplier_id: d.supplier_id,
      items: d.items,
      total,
      status: 'draft',
      keterangan: d.keterangan ?? null,
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return err('VALIDATION', `No. PO "${d.no_po}" sudah dipakai.`, 422);
    }
    return err('DB_ERROR', error.message, 500);
  }
  await logActivity(auth.user.id, `buat PO ${d.no_po} (${d.items.length} item, Rp${Math.round(total).toLocaleString('id-ID')})`, 'purchase_orders', data.id);
  return ok(data, undefined, 201);
}
