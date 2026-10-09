'use client';

import { useState } from 'react';
import { Button, Field, Input, Select, Textarea, toast } from '@/components/ui';
import { toDateInput, cx } from '@/lib/format';

interface CustomerOpt {
  value: string;
  label: string;
  unitKode: string;
}

export function GantiNamaForm({ customers }: { customers: CustomerOpt[] }) {
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState(false);
  const customer = customers.find((c) => c.value === customerId);
  const today = toDateInput(new Date().toISOString());

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) {
      toast('Pilih customer lama dulu.', 'err');
      return;
    }
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get('nama_baru') ?? '').trim()) {
      toast('Nama baru wajib diisi.', 'err');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/transaksi/ganti-nama', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json?.error?.message ?? 'Gagal memproses ganti nama.', 'err');
        return;
      }
      toast('Ganti nama berhasil.');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Customer Lama *">
        <Select name="customer_lama_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">— Pilih customer —</option>
          {customers.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Unit">
        <Input value={customer ? customer.unitKode : '—'} readOnly className="bg-slate-100 dark:bg-slate-800" />
      </Field>
      <Field label="Nama Baru *">
        <Input name="nama_baru" type="text" required placeholder="cth: Budi Santoso" />
      </Field>
      <Field label="NIK Baru">
        <Input name="nik_baru" type="text" placeholder="16 digit NIK" />
      </Field>
      <Field label="No. HP Baru">
        <Input name="no_hp_baru" type="text" placeholder="cth: 0812…" />
      </Field>
      <Field label="Biaya Ganti Nama (Rp)">
        <Input name="biaya_ganti_nama" type="number" min={0} defaultValue="0" />
      </Field>
      <Field label="Alamat Baru" className="sm:col-span-2">
        <Textarea name="alamat_baru" rows={2} placeholder="Alamat domisili baru…" />
      </Field>
      <Field label="Tanggal *">
        <Input name="tanggal" type="date" defaultValue={today} required />
      </Field>
      <Field label="Bukti">
        <input
          name="file"
          type="file"
          accept="image/*,.pdf"
          className={cx(
            'w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200',
            'file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300 dark:text-slate-300',
            'dark:file:bg-slate-700 dark:hover:file:bg-slate-600'
          )}
        />
      </Field>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Memproses…' : 'Proses Ganti Nama'}
        </Button>
      </div>
    </form>
  );
}
