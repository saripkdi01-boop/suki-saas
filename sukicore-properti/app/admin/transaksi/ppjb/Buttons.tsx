'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

interface Opt {
  value: string;
  label: string;
}

interface PpjbRow {
  id: number;
  tanggal: string;
  no_ppjb: string;
  customer_id: number;
  nominal: number | string | null;
  keterangan: string | null;
}

function ppjbFields(customers: Opt[]): AutoField[] {
  return [
    { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { name: 'no_ppjb', label: 'No. PPJB', type: 'text', required: true, placeholder: 'cth: PPJB/2026/001' },
    { name: 'customer_id', label: 'Customer (unit Ready)', type: 'select', required: true, options: customers },
    { name: 'nominal', label: 'Nominal (Rp)', type: 'number', min: 0, placeholder: 'cth: 250000000' },
    { name: 'keterangan', label: 'Keterangan', type: 'textarea', placeholder: 'Catatan tambahan…' },
  ];
}

export function PpjbCreateButton({ customers }: { customers: Opt[] }) {
  return (
    <AutoForm
      title="Tambah PPJB"
      fields={ppjbFields(customers)}
      initial={{ tanggal: toDateInput(new Date().toISOString()) }}
      triggerLabel="Tambah PPJB"
      onSubmit={async (v) => apiPost('/api/v1/ppjb', v)}
    />
  );
}

export function PpjbEditButton({ row, customers }: { row: PpjbRow; customers: Opt[] }) {
  return (
    <AutoForm
      title="Edit PPJB"
      fields={ppjbFields(customers)}
      initial={{
        tanggal: toDateInput(row.tanggal),
        no_ppjb: row.no_ppjb,
        customer_id: String(row.customer_id),
        nominal: row.nominal ?? '',
        keterangan: row.keterangan ?? '',
      }}
      triggerLabel="Edit"
      onSubmit={async (v) => apiPut(`/api/v1/ppjb/${row.id}`, v)}
    />
  );
}

export function PpjbDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/ppjb/${id}`)} />;
}
