import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, parseBody } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { poSchema } from '../route';

const MENU = '/admin/pembelian/input-po';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from('purchase_orders').select('*, suppliers(nama)').eq('id', id).single();
  if (error || !data) return err('NOT_FOUND', 'PO tidak ditemukan.', 404);
  return ok(data);
}

async function ensureDraft(id: string) {
  const { data, error } = await supabaseAdmin().from('purchase_orders').select('id, status, no_po').eq('id', id).single();
  if (error || !data) return { error: err('NOT_FOUND', 'PO tidak ditemukan.', 404) as Response };
  if (data.status !== 'draft') {
    return { error: err('VALIDATION', `PO ${data.no_po} berstatus "${data.status}" — hanya draft yang bisa diubah/dihapus.`, 422) as Response };
  }
  return { row: data as { id: number; status: string; no_po: string } };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const chk = await ensureDraft(id);
  if (chk.error) return chk.error;
  const parsed = await parseBody(req, poSchema);
  if (parsed instanceof Response) return parsed;
  const d = parsed.data;

  const db = supabaseAdmin();
  const ids = [...new Set(d.items.map((i) => i.barang_id))];
  const { data: barangs } = await db.from('items').select('id').in('id', ids);
  if ((barangs ?? []).length !== ids.length) {
    return err('VALIDATION', 'Ada barang pada PO yang tidak ditemukan di master barang.', 422);
  }

  const total = d.items.reduce((s, i) => s + i.qty * i.harga, 0);
  const { data, error } = await db
    .from('purchase_orders')
    .update({
      no_po: d.no_po,
      tanggal: d.tanggal,
      supplier_id: d.supplier_id,
      items: d.items,
      total,
      keterangan: d.keterangan ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return err('VALIDATION', `No. PO "${d.no_po}" sudah dipakai.`, 422);
    return err('DB_ERROR', error.message, 500);
  }
  await logActivity(auth.user.id, `edit PO #${id} (${d.no_po})`, 'purchase_orders', Number(id));
  return ok(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'delete');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const chk = await ensureDraft(id);
  if (chk.error) return chk.error;
  const { error } = await supabaseAdmin().from('purchase_orders').delete().eq('id', id);
  if (error) return err('DB_ERROR', error.message, 500);
  await logActivity(auth.user.id, `hapus PO #${id}`, 'purchase_orders', Number(id));
  return ok({ message: 'Dihapus.' });
}
