'use client';

import { useState } from 'react';
import { Button, Field, Input, Select, toast } from '@/components/ui';
import { toDateInput, cx } from '@/lib/format';

interface Opt {
  value: string;
  label: string;
}

interface CustomerOpt extends Opt {
  unitId: number;
  unitKode: string;
}

export function PindahUnitForm({
  customers,
  readyUnits,
  rekenings,
}: {
  customers: CustomerOpt[];
  readyUnits: Opt[];
  rekenings: Opt[];
}) {
  const [customerId, setCustomerId] = useState('');
  const [unitBaruId, setUnitBaruId] = useState('');
  const [busy, setBusy] = useState(false);
  const customer = customers.find((c) => c.value === customerId);
  const today = toDateInput(new Date().toISOString());

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) {
      toast('Pilih customer dulu.', 'err');
      return;
    }
    if (!unitBaruId) {
      toast('Pilih unit baru.', 'err');
      return;
    }
    if (customer && Number(unitBaruId) === customer.unitId) {
      toast('Unit baru harus berbeda dari unit lama.', 'err');
      return;
    }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/transaksi/pindah-unit', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json?.error?.message ?? 'Gagal memproses pindah unit.', 'err');
        return;
      }
      toast('Pindah unit berhasil.');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Customer *">
        <Select name="customer_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">— Pilih customer —</option>
          {customers.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Unit Lama">
        <Input value={customer ? customer.unitKode : '—'} readOnly className="bg-slate-100 dark:bg-slate-800" />
      </Field>
      <Field label="Unit Baru (Ready) *">
        <Select name="unit_baru_id" value={unitBaruId} onChange={(e) => setUnitBaruId(e.target.value)} required>
          <option value="">— Pilih unit —</option>
          {readyUnits.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Biaya Admin (Rp)">
        <Input name="biaya_admin" type="number" min={0} defaultValue="0" />
      </Field>
      <Field label="Rekening">
        <Select name="rekening_id" defaultValue="">
          <option value="">— Pilih rekening —</option>
          {rekenings.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Metode Bayar">
        <Select name="metode_bayar" defaultValue="">
          <option value="">— Pilih —</option>
          <option value="Transfer">Transfer</option>
          <option value="Tunai">Tunai</option>
        </Select>
      </Field>
      <Field label="Tanggal *">
        <Input name="tanggal" type="date" defaultValue={today} required />
      </Field>
      <Field label="Bukti Bayar">
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
          {busy ? 'Memproses…' : 'Proses Pindah Unit'}
        </Button>
      </div>
    </form>
  );
}
