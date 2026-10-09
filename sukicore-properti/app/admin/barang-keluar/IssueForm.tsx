'use client';

import { useMemo, useState } from 'react';
import { Button, Modal, Field, Input, Select, Textarea, toast, DeleteButton } from '@/components/ui';
import { apiPost, apiDelete } from '@/lib/client-api';

export interface BarangOpt {
  id: number;
  kode: string;
  nama: string;
  satuan: string | null;
  stok: number;
}

interface RowState {
  key: number;
  barang_id: string;
  qty: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Form barang keluar dengan item dinamis + validasi stok client-side. */
export function IssueForm({ barangs }: { barangs: BarangOpt[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tujuan, setTujuan] = useState('');
  const [tanggal, setTanggal] = useState(today());
  const [keterangan, setKeterangan] = useState('');
  const [rows, setRows] = useState<RowState[]>([{ key: 0, barang_id: '', qty: '1' }]);

  const barangMap = useMemo(() => new Map(barangs.map((b) => [String(b.id), b])), [barangs]);

  const addRow = () => setRows((prev) => [...prev, { key: Date.now(), barang_id: '', qty: '1' }]);
  const removeRow = (key: number) => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  const setRow = (key: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tujuan.trim()) return toast('Tujuan wajib diisi.', 'err');
    if (!tanggal) return toast('Tanggal wajib diisi.', 'err');
    const items: Array<{ barang_id: number; kode: string; nama: string; qty: number; satuan: string }> = [];
    for (const r of rows) {
      const b = barangMap.get(r.barang_id);
      if (!b) return toast('Ada baris yang barangnya belum dipilih.', 'err');
      const qty = Number(r.qty);
      if (!(qty > 0)) return toast(`Qty ${b.kode} harus lebih dari 0.`, 'err');
      if (qty > b.stok) return toast(`Stok ${b.kode} tidak mencukupi (tersedia ${b.stok}).`, 'err');
      items.push({ barang_id: b.id, kode: b.kode, nama: b.nama, qty, satuan: b.satuan ?? '' });
    }
    if (items.length === 0) return toast('Harus ada minimal 1 item.', 'err');
    setBusy(true);
    const r = await apiPost('/api/v1/purchasing/issues', {
      tanggal,
      tujuan: tujuan.trim(),
      items,
      keterangan: keterangan.trim() || null,
    });
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal menyimpan.', 'err');
      return;
    }
    toast('Barang keluar tercatat, stok berkurang.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>Catat Barang Keluar</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Barang Keluar" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tujuan *">
              <Input value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder="cth: Proyek BSK Blok A" required />
            </Field>
            <Field label="Tanggal *">
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Barang</span>
              <Button type="button" variant="secondary" onClick={addRow}>+ Baris</Button>
            </div>
            <div className="space-y-2">
              {rows.map((r) => {
                const b = barangMap.get(r.barang_id);
                const qty = Number(r.qty) || 0;
                const kurang = b ? qty > b.stok : false;
                return (
                  <div key={r.key} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <div className="col-span-12 sm:col-span-6">
                      <Field label="Barang *">
                        <Select value={r.barang_id} onChange={(e) => setRow(r.key, { barang_id: e.target.value })} required>
                          <option value="">— Pilih barang —</option>
                          {barangs.map((x) => (
                            <option key={x.id} value={x.id}>{x.kode} — {x.nama} (stok: {x.stok})</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Field label="Qty *">
                        <Input type="number" min={1} value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} required />
                      </Field>
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <div className="text-xs text-slate-500">Tersedia</div>
                      <div className={`text-sm font-semibold ${kurang ? 'text-red-600' : ''}`}>
                        {b ? `${b.stok} ${b.satuan ?? ''}` : '-'}
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeRow(r.key)} className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Hapus baris">✕</button>
                    </div>
                    {kurang && b && (
                      <div className="col-span-12 text-xs text-red-600">Stok tidak mencukupi (tersedia {b.stok}, diminta {qty}).</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Field label="Keterangan">
            <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} placeholder="cth: Untuk pembangunan blok A" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function IssueDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/purchasing/issues/${id}`)} />;
}
