'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

export interface Option {
  value: string;
  label: string;
}

export interface ProyekRow {
  id: number;
  nama: string;
  location_id: number;
  tanggal_mulai: string | null;
  tanggal_target: string | null;
  progress: number;
  status: string;
}

const STATUS_OPTIONS: Option[] = [
  { value: 'rencana', label: 'Rencana' },
  { value: 'berjalan', label: 'Berjalan' },
  { value: 'selesai', label: 'Selesai' },
];

function fields(locations: Option[]): AutoField[] {
  return [
    { name: 'location_id', label: 'Lokasi', type: 'select', required: true, options: locations },
    { name: 'nama', label: 'Nama Proyek', type: 'text', required: true, placeholder: 'cth: Jalan Utama Blok A' },
    { name: 'tanggal_mulai', label: 'Tanggal Mulai', type: 'date' },
    { name: 'tanggal_target', label: 'Tanggal Target', type: 'date' },
    { name: 'progress', label: 'Progress (%)', type: 'number', min: 0 },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
  ];
}

export function ProyekJalanCreateButton({ locations }: { locations: Option[] }) {
  return (
    <AutoForm
      title="Tambah Proyek Jalan"
      fields={fields(locations)}
      initial={{ status: 'berjalan', progress: 0 }}
      triggerLabel="Tambah Proyek"
      onSubmit={async (v) => apiPost('/api/v1/op-jalan/projects', v)}
    />
  );
}

export function ProyekJalanEditButton({ row, locations }: { row: ProyekRow; locations: Option[] }) {
  return (
    <AutoForm
      title="Edit Proyek Jalan"
      fields={fields(locations)}
      initial={{
        location_id: String(row.location_id),
        nama: row.nama,
        tanggal_mulai: toDateInput(row.tanggal_mulai),
        tanggal_target: toDateInput(row.tanggal_target),
        progress: row.progress,
        status: row.status,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/op-jalan/projects/${row.id}`, v)}
    />
  );
}

export function ProyekJalanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/op-jalan/projects/${id}`)} />;
}
