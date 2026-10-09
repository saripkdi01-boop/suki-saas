'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton } from '@/components/ui';
import { apiPost, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

interface Opt {
  value: string;
  label: string;
}

function cancelFields(customers: Opt[]): AutoField[] {
  return [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers },
    { name: 'alasan', label: 'Alasan Pembatalan', type: 'textarea', placeholder: 'cth: Customer membatalkan sepihak…' },
    { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
  ];
}

export function CancelCreateButton({ customers }: { customers: Opt[] }) {
  return (
    <AutoForm
      title="Cancel Pembelian"
      fields={cancelFields(customers)}
      initial={{ tanggal: toDateInput(new Date().toISOString()) }}
      triggerLabel="Cancel Pembelian"
      onSubmit={async (v) => apiPost('/api/v1/cancellations', v)}
    />
  );
}

export function CancelDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/cancellations/${id}`)} />;
}
