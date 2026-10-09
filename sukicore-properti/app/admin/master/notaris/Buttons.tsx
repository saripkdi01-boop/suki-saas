'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Notaris', type: 'text', required: true, placeholder: 'cth: Hj. Ratna Sari, S.H.' },
  { name: 'alamat', label: 'Alamat Kantor', type: 'textarea', placeholder: 'Alamat kantor notaris' },
  { name: 'telepon', label: 'Telepon', type: 'text', placeholder: 'cth: 0812-3456-7890' },
];

export function NotarisCreateButton() {
  return (
    <AutoForm
      title="Tambah Notaris"
      fields={FIELDS}
      triggerLabel="Tambah Notaris"
      onSubmit={async (v) => apiPost('/api/v1/masters/notaris', v)}
    />
  );
}

export function NotarisEditButton({ row }: { row: { id: number; nama: string; alamat: string | null; telepon: string | null } }) {
  return (
    <AutoForm
      title="Edit Notaris"
      fields={FIELDS}
      initial={{ nama: row.nama, alamat: row.alamat, telepon: row.telepon }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/notaris/${row.id}`, v)}
    />
  );
}

export function NotarisDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/notaris/${id}`)} />;
}
