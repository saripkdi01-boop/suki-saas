'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama_bank', label: 'Nama Bank', type: 'text', required: true, placeholder: 'cth: BRI' },
  { name: 'no_rekening', label: 'No. Rekening', type: 'text', required: true, placeholder: 'cth: 0022-0100-1234-567' },
  { name: 'atas_nama', label: 'Atas Nama', type: 'text', placeholder: 'cth: PT Swarna Dwipa Property' },
];

export function RekeningCreateButton() {
  return (
    <AutoForm
      title="Tambah Rekening"
      fields={FIELDS}
      triggerLabel="Tambah Rekening"
      onSubmit={async (v) => apiPost('/api/v1/masters/bank-transaksi', v)}
    />
  );
}

export function RekeningEditButton({ row }: { row: { id: number; nama_bank: string; no_rekening: string; atas_nama: string | null } }) {
  return (
    <AutoForm
      title="Edit Rekening"
      fields={FIELDS}
      initial={{ nama_bank: row.nama_bank, no_rekening: row.no_rekening, atas_nama: row.atas_nama }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/bank-transaksi/${row.id}`, v)}
    />
  );
}

export function RekeningDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/bank-transaksi/${id}`)} />;
}
