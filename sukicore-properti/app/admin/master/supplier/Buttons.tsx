'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Supplier', type: 'text', required: true, placeholder: 'cth: TB Berkah Jaya' },
  { name: 'alamat', label: 'Alamat', type: 'textarea', placeholder: 'Alamat lengkap supplier' },
  { name: 'telepon', label: 'Telepon', type: 'text', placeholder: 'cth: 0812-3456-7890' },
];

export function SupplierCreateButton() {
  return (
    <AutoForm
      title="Tambah Supplier"
      fields={FIELDS}
      triggerLabel="Tambah Supplier"
      onSubmit={async (v) => apiPost('/api/v1/masters/supplier', v)}
    />
  );
}

export function SupplierEditButton({ row }: { row: { id: number; nama: string; alamat: string | null; telepon: string | null } }) {
  return (
    <AutoForm
      title="Edit Supplier"
      fields={FIELDS}
      initial={{ nama: row.nama, alamat: row.alamat, telepon: row.telepon }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/supplier/${row.id}`, v)}
    />
  );
}

export function SupplierDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/supplier/${id}`)} />;
}
