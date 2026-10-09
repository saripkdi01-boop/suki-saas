'use client';

import { useState } from 'react';
import { Button, Modal, Field, Input, Select, Textarea, toast, DeleteButton } from '@/components/ui';
import { apiPost, apiDelete } from '@/lib/client-api';
import { tglWita } from '@/lib/format';

export interface POOption {
  id: number;
  no_po: string;
  tanggal: string;
  supplier_nama: string | null;
  items: Array<{ barang_id: number; kode: string; nama: string; qty: number; satuan: string; harga: number }>;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Form penerimaan barang dari PO: pilih PO → item tampil readonly → simpan. */
export function PenerimaanCreateButton({ pos }: { pos: POOption[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [poId, setPoId] = useState('');
  const [tanggal, setTanggal] = useState(today());
  const [keterangan, setKeterangan] = useState('');
  const selected = pos.find((p) => String(p.id) === poId);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!poId) return toast('Pilih PO terlebih dahulu.', 'err');
    if (!tanggal) return toast('Tanggal wajib diisi.', 'err');
    setBusy(true);
    const r = await apiPost('/api/v1/purchasing/receipts', {
      po_id: Number(poId),
      tanggal,
      keterangan: keterangan.trim() || null,
    });
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal menyimpan penerimaan.', 'err');
      return;
    }
    toast('Barang diterima, stok bertambah.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>Terima Barang</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Penerimaan Barang (dari PO)" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Purchase Order *">
              <Select value={poId} onChange={(e) => setPoId(e.target.value)} required>
                <option value="">— Pilih PO —</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.no_po} — {tglWita(p.tanggal)}{p.supplier_nama ? ` — ${p.supplier_nama}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tanggal Terima *">
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </Field>
          </div>
          {selected && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700">
                Item PO {selected.no_po} ({selected.items.length} item) — akan menambah stok
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-4 py-2">Barang</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2">Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selected.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{it.kode} — {it.nama}</td>
                      <td className="px-4 py-2 text-right font-semibold">{it.qty}</td>
                      <td className="px-4 py-2">{it.satuan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Field label="Keterangan">
            <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} placeholder="cth: Diterima lengkap, kondisi baik" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Penerimaan'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PenerimaanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/purchasing/receipts/${id}`)} />;
}
