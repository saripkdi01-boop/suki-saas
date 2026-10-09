'use client';

import { useState } from 'react';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, Modal, Field, Input, Select, Textarea, toast } from '@/components/ui';
import { apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

export const JENIS_OPTS = [
  { value: 'harga_rumah', label: 'Harga Rumah' },
  { value: 'biaya_surat', label: 'Biaya Surat' },
  { value: 'peningkatan_mutu', label: 'Peningkatan Mutu' },
  { value: 'booking_fee', label: 'Booking Fee' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const JENIS_LABEL: Record<string, string> = Object.fromEntries(
  JENIS_OPTS.map((o) => [o.value, o.label])
);

export interface CustomerOpt {
  value: string;
  label: string;
  unitKode: string | null;
}

export interface Opt {
  value: string;
  label: string;
}

export interface PaymentRow {
  id: number;
  tanggal: string;
  customer_id: number;
  unit_id: number | null;
  jenis_tagihan: string;
  tagihan: number | string;
  sudah_bayar: number | string;
  metode: string | null;
  rekening_id: number | null;
  keterangan: string | null;
}

const todayInput = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/**
 * Form tambah pembayaran: kustom (bukan AutoForm) karena ada upload file bukti
 * dan tampilan unit otomatis dari customer yang dipilih.
 */
export function PaymentCreateButton({
  customers,
  rekenings,
}: {
  customers: CustomerOpt[];
  rekenings: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unitKode, setUnitKode] = useState<string | null>(null);

  const onCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = customers.find((c) => c.value === e.target.value);
    setUnitKode(found?.unitKode ?? null);
  };

  const close = () => {
    if (!busy) {
      setOpen(false);
      setUnitKode(null);
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get('customer_id') ?? '').trim()) {
      toast('Customer wajib dipilih.', 'err');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/payments', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json?.error?.message ?? 'Gagal menyimpan pembayaran.', 'err');
        return;
      }
      toast('Pembayaran tersimpan.');
      setOpen(false);
      window.location.reload();
    } catch {
      toast('Gagal menyimpan pembayaran.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah Pembayaran</Button>
      <Modal open={open} onClose={close} title="Tambah Pembayaran" wide>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer *" className="sm:col-span-2">
            <Select name="customer_id" required defaultValue="" onChange={onCustomerChange}>
              <option value="">— Pilih customer —</option>
              {customers.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Unit (otomatis)">
            <Input type="text" value={unitKode ?? '-'} readOnly placeholder="-" />
          </Field>
          <Field label="Jenis Tagihan *">
            <Select name="jenis_tagihan" required defaultValue="">
              <option value="">— Pilih jenis —</option>
              {JENIS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tagihan (Rp) *">
            <Input name="tagihan" type="number" min={0} step="any" defaultValue="0" required />
          </Field>
          <Field label="Sudah Bayar (Rp)">
            <Input name="sudah_bayar" type="number" min={0} step="any" defaultValue="0" />
          </Field>
          <Field label="Metode">
            <Input name="metode" type="text" placeholder="cth: Transfer / Tunai" />
          </Field>
          <Field label="Rekening">
            <Select name="rekening_id" defaultValue="">
              <option value="">— Tanpa rekening —</option>
              {rekenings.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal *">
            <Input name="tanggal" type="date" defaultValue={todayInput()} required />
          </Field>
          <Field label="Bukti Pembayaran (file)">
            <Input name="file" type="file" accept="image/*,.pdf" />
          </Field>
          <Field label="Keterangan" className="sm:col-span-2">
            <Textarea name="keterangan" rows={3} placeholder="Keterangan tambahan (opsional)" />
          </Field>
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={close} disabled={busy}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const editFields: AutoField[] = [
  {
    name: 'jenis_tagihan',
    label: 'Jenis Tagihan',
    type: 'select',
    options: JENIS_OPTS.map((o) => ({ value: o.value, label: o.label })),
  },
  { name: 'tagihan', label: 'Tagihan (Rp)', type: 'number', min: 0, step: 'any' },
  { name: 'sudah_bayar', label: 'Sudah Bayar (Rp)', type: 'number', min: 0, step: 'any' },
  { name: 'metode', label: 'Metode', type: 'text', placeholder: 'cth: Transfer / Tunai' },
  { name: 'tanggal', label: 'Tanggal', type: 'date' },
  { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
];

export function PaymentEditButton({ row }: { row: PaymentRow }) {
  return (
    <AutoForm
      title="Edit Pembayaran"
      fields={editFields}
      initial={{
        jenis_tagihan: row.jenis_tagihan,
        tagihan: row.tagihan,
        sudah_bayar: row.sudah_bayar,
        metode: row.metode ?? '',
        tanggal: toDateInput(row.tanggal),
        keterangan: row.keterangan ?? '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/payments/${row.id}`, v)}
    />
  );
}

export function PaymentDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/payments/${id}`)} />;
}
