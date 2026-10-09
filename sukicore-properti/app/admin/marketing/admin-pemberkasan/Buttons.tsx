'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface AdminStaffRow {
  id: number;
  kode: string;
  nama: string;
  is_active: boolean;
}

const FIELDS: AutoField[] = [
  { name: 'kode', label: 'Kode', type: 'text', required: true, placeholder: 'cth: ADM-001' },
  { name: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama lengkap staf' },
  { name: 'is_active', label: 'Aktif', type: 'checkbox' },
];

export function AdminPemberkasanCreateButton() {
  return (
    <AutoForm
      title="Tambah Admin Pemberkasan"
      fields={FIELDS}
      initial={{ is_active: true }}
      triggerLabel="Tambah Admin"
      onSubmit={async (v) => apiPost('/api/v1/admin-staff', v)}
    />
  );
}

export function AdminPemberkasanEditButton({ row }: { row: AdminStaffRow }) {
  return (
    <AutoForm
      title="Edit Admin Pemberkasan"
      fields={FIELDS}
      initial={{ kode: row.kode, nama: row.nama, is_active: row.is_active }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/admin-staff/${row.id}`, v)}
    />
  );
}

export function AdminPemberkasanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/admin-staff/${id}`)} />;
}
