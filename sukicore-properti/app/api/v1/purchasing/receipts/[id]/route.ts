import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import type { POItem } from '../../po/route';

const MENU = '/admin/pembelian/barang-masuk';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from('goods_receipts')
    .select('*, purchase_orders(no_po)')
    .eq('id', id)
    .single();
  if (error || !data) return err('NOT_FOUND', 'Data penerimaan tidak ditemukan.', 404);
  return ok(data);
}

/**
 * Hapus penerimaan: kembalikan stok (kurangi sesuai item), PO kembali 'dipesan'.
 * Ditolak bila ada barang yang stoknya sudah terpakai (hasil < 0).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: rec, error: fetchErr } = await db.from('goods_receipts').select('*').eq('id', id).single();
  if (fetchErr || !rec) return err('NOT_FOUND', 'Data penerimaan tidak ditemukan.', 404);

  const items = (rec.items ?? []) as POItem[];
  const ids = [...new Set(items.map((i) => i.barang_id))];
  const { data: barangs } = await db.from('items').select('id, kode, nama, stok').in('id', ids);
  const stokMap = new Map<number, { stok: number; nama: string }>();
  for (const b of (barangs ?? []) as Array<{ id: number; kode: string; nama: string; stok: number }>) {
    stokMap.set(b.id, { stok: Number(b.stok), nama: `${b.kode} - ${b.nama}` });
  }
  for (const it of items) {
    const cur = stokMap.get(it.barang_id);
    if (!cur) return err('VALIDATION', `Barang #${it.barang_id} tidak ditemukan di master.`, 422);
    if (cur.stok - it.qty < 0) {
      return err('VALIDATION', `Stok ${cur.nama} tidak mencukupi untuk pembatalan (sudah terpakai).`, 422);
    }
  }
  for (const it of items) {
    const cur = stokMap.get(it.barang_id)!;
    await db.from('items').update({ stok: cur.stok - it.qty }).eq('id', it.barang_id);
  }
  const { error } = await db.from('goods_receipts').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  if (rec.po_id) await db.from('purchase_orders').update({ status: 'dipesan' }).eq('id', rec.po_id);
  await logActivity(auth.user.id, `batal terima barang #${id}`, 'goods_receipts', Number(id));
  return ok({ message: 'Dihapus, stok dikembalikan.' });
}
