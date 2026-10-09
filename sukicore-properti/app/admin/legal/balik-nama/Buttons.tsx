'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

export interface Option {
  value: string;
  label: string;
}

export interface BalikNamaRow {
  id: number;
  customer_id: number;
  unit_id: number | null;
  status: string;
  tanggal: string | null;
  nominal: number | string | null;
  notaris_id: number | null;
  keterangan: string | null;
}

const STATUS_OPTIONS: Option[] = [
  { value: 'belum', label: 'Belum' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
];

function fields(customers: Option[], units: Option[], notaris: Option[]): AutoField[] {
  return [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers },
    { name: 'unit_id', label: 'Unit', type: 'select', options: units },
    { name: 'notaris_id', label: 'Notaris', type: 'select', options: notaris },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
    { name: 'tanggal', label: 'Tanggal', type: 'date' },
    { name: 'nominal', label: 'Nominal (Rp)', type: 'number', min: 0, step: '0.01' },
    { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
  ];
}

export function BalikNamaCreateButton({ customers, units, notaris }: { customers: Option[]; units: Option[]; notaris: Option[] }) {
  return (
    <AutoForm
      title="Tambah Balik Nama"
      fields={fields(customers, units, notaris)}
      initial={{ status: 'belum' }}
      triggerLabel="Tambah Data"
      wide
      onSubmit={async (v) => apiPost('/api/v1/legal/balik-nama', v)}
    />
  );
}

export function BalikNamaEditButton({ row, customers, units, notaris }: { row: BalikNamaRow; customers: Option[]; units: Option[]; notaris: Option[] }) {
  return (
    <AutoForm
      title="Edit Balik Nama"
      fields={fields(customers, units, notaris)}
      initial={{
        customer_id: String(row.customer_id),
        unit_id: row.unit_id ? String(row.unit_id) : '',
        notaris_id: row.notaris_id ? String(row.notaris_id) : '',
        status: row.status,
        tanggal: toDateInput(row.tanggal),
        nominal: row.nominal === null || row.nominal === undefined ? '' : String(row.nominal),
        keterangan: row.keterangan ?? '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/legal/balik-nama/${row.id}`, v)}
    />
  );
}

export function BalikNamaDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/legal/balik-nama/${id}`)} />;
}
