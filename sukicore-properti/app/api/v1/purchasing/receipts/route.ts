import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import type { POItem } from '../po/route';

const MENU = '/admin/pembelian/barang-masuk';

const optText = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(1000).nullable().optional()
);

const receiptSchema = z.object({
  po_id: z.preprocess((v) => Number(v), z.number().int().positive('PO wajib dipilih.')),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.'),
  keterangan: optText,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  let query = supabaseAdmin()
    .from('goods_receipts')
    .select('*, purchase_orders(no_po)', { count: 'exact' })
    .order('tanggal', { ascending: false });
  if (q) query = query.ilike('keterangan', `%${q}%`);
  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

/**
 * Terima barang dari PO: simpan penerimaan, tambah stok tiap item,
 * ubah status PO menjadi 'diterima'.
 */
export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;
  const parsed = await parseBody(req, receiptSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;
  const db = supabaseAdmin();

  const { data: po, error: poErr } = await db.from('purchase_orders').select('*').eq('id', d.po_id).single();
  if (poErr || !po) return err('NOT_FOUND', 'PO tidak ditemukan.', 404);
  if (!['draft', 'dipesan'].includes(po.status)) {
    return err('VALIDATION', `PO ${po.no_po} berstatus "${po.status}" — tidak bisa diterima lagi.`, 422);
  }
  const items = (po.items ?? []) as POItem[];
  if (items.length === 0) return err('VALIDATION', `PO ${po.no_po} tidak memiliki item.`, 422);

  // Tambah stok per barang
  const ids = [...new Set(items.map((i) => i.barang_id))];
  const { data: barangs } = await db.from('items').select('id, stok').in('id', ids);
  const stokMap = new Map<number, number>();
  for (const b of (barangs ?? []) as Array<{ id: number; stok: number }>) stokMap.set(b.id, Number(b.stok));
  for (const it of items) {
    const cur = stokMap.get(it.barang_id) ?? 0;
    const { error } = await db.from('items').update({ stok: cur + it.qty }).eq('id', it.barang_id);
    if (error) return err('DB_ERROR', `Gagal menambah stok barang #${it.barang_id}: ${error.message}`, 500);
  }

  const { data, error } = await db
    .from('goods_receipts')
    .insert({ tanggal: d.tanggal, po_id: d.po_id, items, keterangan: d.keterangan ?? null })
    .select()
    .single();
  if (error) return err('DB_ERROR', error.message, 500);
  await db.from('purchase_orders').update({ status: 'diterima' }).eq('id', d.po_id);
  await logActivity(auth.user.id, `terima barang PO ${po.no_po} (${items.length} item)`, 'goods_receipts', data.id);
  return ok(data, undefined, 201);
}
