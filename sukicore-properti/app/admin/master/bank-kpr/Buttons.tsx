'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Bank', type: 'text', required: true, placeholder: 'cth: BTN' },
];

export function BankKprCreateButton() {
  return (
    <AutoForm
      title="Tambah Bank KPR"
      fields={FIELDS}
      triggerLabel="Tambah Bank"
      onSubmit={async (v) => apiPost('/api/v1/masters/bank-kpr', v)}
    />
  );
}

export function BankKprEditButton({ row }: { row: { id: number; nama: string } }) {
  return (
    <AutoForm
      title="Edit Bank KPR"
      fields={FIELDS}
      initial={{ nama: row.nama }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/bank-kpr/${row.id}`, v)}
    />
  );
}

export function BankKprDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/bank-kpr/${id}`)} />;
}
