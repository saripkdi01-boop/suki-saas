'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Status', type: 'text', required: true, placeholder: 'cth: Booking Fee' },
  { name: 'warna_hex', label: 'Warna (Hex)', type: 'text', required: true, placeholder: '#ffffff' },
  { name: 'urutan', label: 'Urutan', type: 'number', min: 0, step: '1' },
  { name: 'keterangan', label: 'Keterangan', type: 'text', placeholder: 'cth: unit tersedia' },
];

interface StatusRow {
  id: number;
  nama: string;
  warna_hex: string;
  urutan: number;
  keterangan: string | null;
}

export function StatusCreateButton() {
  return (
    <AutoForm
      title="Tambah Status"
      fields={FIELDS}
      initial={{ warna_hex: '#ffffff', urutan: 0 }}
      triggerLabel="Tambah Status"
      onSubmit={(v) => apiPost('/api/v1/settings/statuses', v)}
    />
  );
}

export function StatusEditButton({ row }: { row: StatusRow }) {
  return (
    <AutoForm
      title={`Edit Status — ${row.nama}`}
      fields={FIELDS}
      initial={{ nama: row.nama, warna_hex: row.warna_hex, urutan: row.urutan, keterangan: row.keterangan ?? '' }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={(v) => apiPut(`/api/v1/settings/statuses/${row.id}`, v)}
    />
  );
}

export function StatusDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/settings/statuses/${id}`)} />;
}
