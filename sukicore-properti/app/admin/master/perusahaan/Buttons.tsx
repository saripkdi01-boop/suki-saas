'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Perusahaan', type: 'text', required: true, placeholder: 'cth: PT Swarna Dwipa Property' },
  { name: 'alamat', label: 'Alamat', type: 'textarea', placeholder: 'Alamat lengkap perusahaan' },
  { name: 'telepon', label: 'Telepon', type: 'text', placeholder: 'cth: 0401-123456' },
  { name: 'email', label: 'Email', type: 'text', placeholder: 'cth: info@perusahaan.id' },
];

export function PerusahaanCreateButton() {
  return (
    <AutoForm
      title="Tambah Perusahaan"
      fields={FIELDS}
      triggerLabel="Tambah Perusahaan"
      onSubmit={async (v) => apiPost('/api/v1/masters/perusahaan', v)}
    />
  );
}

export function PerusahaanEditButton({ row }: { row: { id: number; nama: string; alamat: string | null; telepon: string | null; email: string | null } }) {
  return (
    <AutoForm
      title="Edit Perusahaan"
      fields={FIELDS}
      initial={{ nama: row.nama, alamat: row.alamat, telepon: row.telepon, email: row.email }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/perusahaan/${row.id}`, v)}
    />
  );
}

export function PerusahaanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/perusahaan/${id}`)} />;
}
