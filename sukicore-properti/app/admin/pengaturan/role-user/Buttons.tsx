'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Role', type: 'text', required: true, placeholder: 'cth: Marketing' },
];

export function RoleCreateButton() {
  return (
    <AutoForm
      title="Tambah Role"
      fields={FIELDS}
      triggerLabel="Tambah Role"
      onSubmit={(v) => apiPost('/api/v1/settings/roles', v)}
    />
  );
}

export function RoleEditButton({ row }: { row: { id: number; nama: string } }) {
  return (
    <AutoForm
      title={`Edit Role — ${row.nama}`}
      fields={FIELDS}
      initial={{ nama: row.nama }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={(v) => apiPut(`/api/v1/settings/roles/${row.id}`, v)}
    />
  );
}

export function RoleDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/settings/roles/${id}`)} />;
}
