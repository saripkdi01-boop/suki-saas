import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/barang-keluar';

interface IssueItem {
  barang_id: number;
  kode: string;
  nama: string;
  qty: number;
  satuan: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from('goods_issues').select('*').eq('id', id).single();
  if (error || !data) return err('NOT_FOUND', 'Data barang keluar tidak ditemukan.', 404);
  return ok(data);
}

/** Hapus barang keluar: kembalikan stok (tambah sesuai item). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: rec, error: fetchErr } = await db.from('goods_issues').select('*').eq('id', id).single();
  if (fetchErr || !rec) return err('NOT_FOUND', 'Data barang keluar tidak ditemukan.', 404);

  const items = (rec.items ?? []) as IssueItem[];
  const ids = [...new Set(items.map((i) => i.barang_id))];
  const { data: barangs } = await db.from('items').select('id, stok').in('id', ids);
  const stokMap = new Map<number, number>();
  for (const b of (barangs ?? []) as Array<{ id: number; stok: number }>) stokMap.set(b.id, Number(b.stok));
  for (const it of items) {
    const cur = stokMap.get(it.barang_id) ?? 0;
    await db.from('items').update({ stok: cur + it.qty }).eq('id', it.barang_id);
  }
  const { error } = await db.from('goods_issues').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `batal barang keluar #${id} (stok dikembalikan)`, 'goods_issues', Number(id));
  return ok({ message: 'Dihapus, stok dikembalikan.' });
}
