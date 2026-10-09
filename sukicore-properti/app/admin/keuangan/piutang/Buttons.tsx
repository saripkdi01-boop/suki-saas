'use client';

import { useState } from 'react';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, Modal, Field, Input, toast } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput, rp } from '@/lib/format';

export interface PiutangRow {
  id: number;
  tanggal: string;
  pihak: string;
  jumlah: number | string;
  sudah_bayar: number | string;
  status: string;
  keterangan: string | null;
}

const STATUS_OPTS = [
  { value: 'belum_lunas', label: 'Belum Lunas' },
  { value: 'lunas', label: 'Lunas' },
];

const FIELDS: AutoField[] = [
  { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
  { name: 'pihak', label: 'Pihak (penghutang)', type: 'text', required: true, placeholder: 'cth: Budi Santoso' },
  { name: 'jumlah', label: 'Jumlah Piutang (Rp)', type: 'number', required: true, min: 1 },
  { name: 'sudah_bayar', label: 'Sudah Bayar (Rp)', type: 'number', min: 0 },
  { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTS },
  { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function PiutangCreateButton() {
  return (
    <AutoForm
      title="Tambah Piutang"
      fields={FIELDS}
      initial={{ tanggal: today(), sudah_bayar: 0, status: 'belum_lunas' }}
      triggerLabel="Tambah Piutang"
      wide
      onSubmit={async (v) => apiPost('/api/v1/finance/receivables', v)}
    />
  );
}

export function PiutangEditButton({ row }: { row: PiutangRow }) {
  return (
    <AutoForm
      title="Edit Piutang"
      fields={FIELDS}
      initial={{
        tanggal: toDateInput(row.tanggal),
        pihak: row.pihak,
        jumlah: row.jumlah,
        sudah_bayar: row.sudah_bayar,
        status: row.status,
        keterangan: row.keterangan,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/finance/receivables/${row.id}`, v)}
    />
  );
}

export function PiutangDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/finance/receivables/${id}`)} />;
}

/** Modal kecil untuk mencatat pelunasan piutang. */
export function PiutangBayarButton({ row }: { row: PiutangRow }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sisa = Number(row.jumlah) - Number(row.sudah_bayar);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const jumlah = Number(fd.get('jumlah'));
    if (!jumlah || jumlah <= 0) {
      toast('Jumlah bayar harus lebih dari 0.', 'err');
      return;
    }
    setBusy(true);
    const r = await apiPost(`/api/v1/finance/receivables/${row.id}/pay`, { jumlah });
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal mencatat pelunasan.', 'err');
      return;
    }
    toast('Pelunasan tercatat.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Button variant="success" onClick={() => setOpen(true)}>Terima</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Terima Pelunasan — ${row.pihak}`}>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Sisa piutang: <span className="font-bold">{rp(sisa)}</span>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Jumlah Diterima (Rp) *">
            <Input name="jumlah" type="number" min={1} max={Math.max(1, Math.round(sisa))} required placeholder="cth: 500000" />
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
