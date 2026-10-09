'use client';

import { useMemo, useState } from 'react';
import { Button, Modal, Field, Input, Select, Textarea, toast, DeleteButton } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput, rp } from '@/lib/format';
import { cx } from '@/lib/format';

export interface SupplierOpt {
  id: number;
  nama: string;
}
export interface BarangOpt {
  id: number;
  kode: string;
  nama: string;
  satuan: string | null;
  stok: number;
  harga_beli: number | string | null;
}
export interface POItemInput {
  barang_id: number;
  kode: string;
  nama: string;
  qty: number;
  satuan: string;
  harga: number;
}
export interface POEditData {
  id: number;
  no_po: string;
  tanggal: string;
  supplier_id: number | null;
  keterangan: string | null;
  items: POItemInput[];
}

interface RowState {
  key: number;
  barang_id: string;
  qty: string;
  harga: string;
}

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', dipesan: 'Dipesan', diterima: 'Diterima', batal: 'Batal' };

/** Form PO dengan daftar item dinamis (tambah/hapus baris, total otomatis). */
export function POForm({
  suppliers,
  barangs,
  po,
  triggerLabel,
}: {
  suppliers: SupplierOpt[];
  barangs: BarangOpt[];
  po?: POEditData | null;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noPo, setNoPo] = useState(po?.no_po ?? '');
  const [tanggal, setTanggal] = useState(po ? toDateInput(po.tanggal) : new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState(po?.supplier_id ? String(po.supplier_id) : '');
  const [keterangan, setKeterangan] = useState(po?.keterangan ?? '');
  const [rows, setRows] = useState<RowState[]>(
    po?.items?.map((it, i) => ({ key: i, barang_id: String(it.barang_id), qty: String(it.qty), harga: String(it.harga) })) ?? [
      { key: 0, barang_id: '', qty: '1', harga: '0' },
    ]
  );

  const barangMap = useMemo(() => new Map(barangs.map((b) => [String(b.id), b])), [barangs]);

  const lines = rows.map((r) => {
    const b = barangMap.get(r.barang_id);
    const qty = Number(r.qty) || 0;
    const harga = Number(r.harga) || 0;
    return { ...r, barang: b, subtotal: qty * harga };
  });
  const total = lines.reduce((s, l) => s + l.subtotal, 0);

  const addRow = () => setRows((prev) => [...prev, { key: Date.now(), barang_id: '', qty: '1', harga: '0' }]);
  const removeRow = (key: number) => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  const setRow = (key: number, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.barang_id !== undefined) {
          const b = barangMap.get(patch.barang_id);
          if (b && b.harga_beli !== null) next.harga = String(b.harga_beli);
        }
        return next;
      })
    );
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!noPo.trim()) return toast('No. PO wajib diisi.', 'err');
    if (!tanggal) return toast('Tanggal wajib diisi.', 'err');
    const items: POItemInput[] = [];
    for (const l of lines) {
      const b = l.barang;
      if (!b) return toast('Ada baris yang barangnya belum dipilih.', 'err');
      const qty = Number(l.qty);
      const harga = Number(l.harga);
      if (!(qty > 0)) return toast(`Qty ${b.kode} harus lebih dari 0.`, 'err');
      if (!(harga >= 0)) return toast(`Harga ${b.kode} tidak boleh negatif.`, 'err');
      items.push({ barang_id: b.id, kode: b.kode, nama: b.nama, qty, satuan: b.satuan ?? '', harga });
    }
    if (items.length === 0) return toast('PO harus memiliki minimal 1 item.', 'err');
    const payload = {
      no_po: noPo.trim(),
      tanggal,
      supplier_id: supplierId ? Number(supplierId) : null,
      items,
      keterangan: keterangan.trim() || null,
    };
    setBusy(true);
    const r = po ? await apiPut(`/api/v1/purchasing/po/${po.id}`, payload) : await apiPost('/api/v1/purchasing/po', payload);
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal menyimpan PO.', 'err');
      return;
    }
    toast('PO tersimpan.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Button variant={po ? 'secondary' : 'primary'} onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={po ? `Edit PO ${po.no_po}` : 'Buat Purchase Order'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="No. PO *">
              <Input value={noPo} onChange={(e) => setNoPo(e.target.value)} placeholder="cth: PO-2026-001" required />
            </Field>
            <Field label="Tanggal *">
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </Field>
            <Field label="Supplier">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Pilih —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </Select>
            </Field>
            <Field label="Keterangan">
              <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Keterangan PO" />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Barang</span>
              <Button type="button" variant="secondary" onClick={addRow}>+ Baris</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.key} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <div className="col-span-12 sm:col-span-4">
                    <Field label="Barang *">
                      <Select value={l.barang_id} onChange={(e) => setRow(l.key, { barang_id: e.target.value })} required>
                        <option value="">— Pilih barang —</option>
                        {barangs.map((b) => (
                          <option key={b.id} value={b.id}>{b.kode} — {b.nama} (stok: {b.stok})</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Field label="Qty *">
                      <Input type="number" min={1} value={l.qty} onChange={(e) => setRow(l.key, { qty: e.target.value })} required />
                    </Field>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Field label="Satuan">
                      <Input value={l.barang?.satuan ?? ''} readOnly placeholder="-" />
                    </Field>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Field label="Harga *">
                      <Input type="number" min={0} value={l.harga} onChange={(e) => setRow(l.key, { harga: e.target.value })} required />
                    </Field>
                  </div>
                  <div className="col-span-10 sm:col-span-1">
                    <div className="text-xs text-slate-500">Subtotal</div>
                    <div className="text-sm font-semibold">{rp(l.subtotal)}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeRow(l.key)} className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Hapus baris">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total PO</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{rp(total)}</span>
          </div>

          <div className={cx('flex justify-end gap-2')}>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan PO'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export { STATUS_LABEL };

export function PODeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/purchasing/po/${id}`)} />;
}
