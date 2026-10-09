'use client';

import { useState } from 'react';
import { DeleteButton, Button, Modal, Field, Input, Select, Textarea, toast } from '@/components/ui';
import { apiGet, apiDelete } from '@/lib/client-api';

interface Opt {
  value: string;
  label: string;
}

function todayWita(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

export function HandoverCreateButton({ customers }: { customers: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [unitInfo, setUnitInfo] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState(todayWita());
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (id: string) => {
    setCustomerId(id);
    setUnitInfo(null);
    if (!id) return;
    const r = await apiGet<{ units?: { kode_kavling?: string } | null; kode_kavling?: string }>(
      `/api/v1/customers/${id}`
    );
    if (r.ok && r.data) {
      setUnitInfo(r.data.units?.kode_kavling ?? r.data.kode_kavling ?? '-');
    } else {
      setUnitInfo(r.error ?? 'Gagal memuat data customer.');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast('Customer wajib dipilih.', 'err');
      return;
    }
    if (!tanggal) {
      toast('Tanggal wajib diisi.', 'err');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('customer_id', customerId);
      form.append('tanggal', tanggal);
      form.append('catatan', catatan);
      if (file) form.append('file', file);
      const res = await fetch('/api/v1/handovers', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        toast(json?.error?.message ?? 'Gagal mencatat serah terima.', 'err');
        return;
      }
      toast('Serah terima kunci tercatat.');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Catat Serah Terima</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Catat Serah Terima Kunci">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Customer (status Akad)">
            <Select value={customerId} onChange={(e) => pick(e.target.value)}>
              <option value="">— Pilih customer —</option>
              {customers.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          {customerId && unitInfo !== null && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Unit: <span className="font-semibold">{unitInfo}</span>
            </div>
          )}
          <Field label="Tanggal">
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
          </Field>
          <Field label="Catatan">
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} placeholder="cth: Serah terima kunci unit beserta dokumen" />
          </Field>
          <Field label="Bukti (opsional)">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300 dark:text-slate-300 dark:file:bg-slate-700 dark:hover:file:bg-slate-600"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function HandoverDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/handovers/${id}`)} />;
}
