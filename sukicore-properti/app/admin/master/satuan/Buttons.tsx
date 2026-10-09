'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Satuan', type: 'text', required: true, placeholder: 'cth: UNIT' },
];

export function SatuanCreateButton() {
  return (
    <AutoForm
      title="Tambah Satuan"
      fields={FIELDS}
      triggerLabel="Tambah Satuan"
      onSubmit={async (v) => apiPost('/api/v1/masters/satuan', v)}
    />
  );
}

export function SatuanEditButton({ row }: { row: { id: number; nama: string } }) {
  return (
    <AutoForm
      title="Edit Satuan"
      fields={FIELDS}
      initial={{ nama: row.nama }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/satuan/${row.id}`, v)}
    />
  );
}

export function SatuanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/satuan/${id}`)} />;
}
