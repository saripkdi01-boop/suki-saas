'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

export interface PengeluaranRow {
  id: number;
  tanggal: string;
  kategori_id: number | null;
  rekening_id: number | null;
  jumlah: number | string;
  keterangan: string | null;
  bukti_url: string | null;
  finance_categories: { nama: string } | null;
  bank_transaksi: { nama_bank: string; no_rekening: string } | null;
}

export interface Opt {
  value: string;
  label: string;
}

interface Props {
  kategoriOpts: Opt[];
  rekeningOpts: Opt[];
}

function fields(o: Props): AutoField[] {
  return [
    { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { name: 'kategori_id', label: 'Kategori', type: 'select', required: true, options: o.kategoriOpts },
    { name: 'rekening_id', label: 'Rekening', type: 'select', options: o.rekeningOpts },
    { name: 'jumlah', label: 'Jumlah (Rp)', type: 'number', required: true, min: 1 },
    { name: 'keterangan', label: 'Keterangan', type: 'textarea', placeholder: 'cth: Beli semen 50 sak' },
    { name: 'bukti_url', label: 'URL Bukti (opsional)', type: 'text', placeholder: 'https://…' },
  ];
}

const today = () => new Date().toISOString().slice(0, 10);

export function PengeluaranCreateButton(o: Props) {
  return (
    <AutoForm
      title="Tambah Pengeluaran"
      fields={fields(o)}
      initial={{ tanggal: today() }}
      triggerLabel="Tambah Pengeluaran"
      wide
      onSubmit={async (v) => apiPost('/api/v1/finance/expenses', v)}
    />
  );
}

export function PengeluaranEditButton({ row, ...o }: { row: PengeluaranRow } & Props) {
  return (
    <AutoForm
      title="Edit Pengeluaran"
      fields={fields(o)}
      initial={{
        tanggal: toDateInput(row.tanggal),
        kategori_id: row.kategori_id,
        rekening_id: row.rekening_id,
        jumlah: row.jumlah,
        keterangan: row.keterangan,
        bukti_url: row.bukti_url,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/finance/expenses/${row.id}`, v)}
    />
  );
}

export function PengeluaranDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/finance/expenses/${id}`)} />;
}
