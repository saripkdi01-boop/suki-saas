'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

export interface Option {
  value: string;
  label: string;
}

export interface BphtbSspRow {
  id: number;
  customer_id: number;
  unit_id: number | null;
  jenis: string;
  status: string;
  tanggal: string | null;
  nominal: number | string | null;
  keterangan: string | null;
}

const JENIS_OPTIONS: Option[] = [
  { value: 'bphtb', label: 'BPHTB' },
  { value: 'ssp', label: 'SSP' },
];

const STATUS_OPTIONS: Option[] = [
  { value: 'belum', label: 'Belum' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
];

function fields(customers: Option[], units: Option[]): AutoField[] {
  return [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers },
    { name: 'unit_id', label: 'Unit', type: 'select', options: units },
    { name: 'jenis', label: 'Jenis', type: 'select', required: true, options: JENIS_OPTIONS },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
    { name: 'tanggal', label: 'Tanggal', type: 'date' },
    { name: 'nominal', label: 'Nominal (Rp)', type: 'number', min: 0, step: '0.01' },
    { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
  ];
}

export function BphtbSspCreateButton({ customers, units }: { customers: Option[]; units: Option[] }) {
  return (
    <AutoForm
      title="Tambah BPHTB/SSP"
      fields={fields(customers, units)}
      initial={{ jenis: 'bphtb', status: 'belum' }}
      triggerLabel="Tambah Data"
      wide
      onSubmit={async (v) => apiPost('/api/v1/legal/bphtb-ssp', v)}
    />
  );
}

export function BphtbSspEditButton({ row, customers, units }: { row: BphtbSspRow; customers: Option[]; units: Option[] }) {
  return (
    <AutoForm
      title="Edit BPHTB/SSP"
      fields={fields(customers, units)}
      initial={{
        customer_id: String(row.customer_id),
        unit_id: row.unit_id ? String(row.unit_id) : '',
        jenis: row.jenis,
        status: row.status,
        tanggal: toDateInput(row.tanggal),
        nominal: row.nominal === null || row.nominal === undefined ? '' : String(row.nominal),
        keterangan: row.keterangan ?? '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/legal/bphtb-ssp/${row.id}`, v)}
    />
  );
}

export function BphtbSspDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/legal/bphtb-ssp/${id}`)} />;
}
