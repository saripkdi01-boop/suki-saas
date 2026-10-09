'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface KategoriRow {
  id: number;
  nama: string;
  tipe: string;
  created_at: string;
}

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Kategori', type: 'text', required: true, placeholder: 'cth: Booking Fee' },
  {
    name: 'tipe',
    label: 'Tipe',
    type: 'select',
    required: true,
    options: [
      { value: 'pemasukan', label: 'Pemasukan' },
      { value: 'pengeluaran', label: 'Pengeluaran' },
    ],
  },
];

export function KategoriCreateButton() {
  return (
    <AutoForm
      title="Tambah Kategori"
      fields={FIELDS}
      initial={{ tipe: 'pemasukan' }}
      triggerLabel="Tambah Kategori"
      onSubmit={async (v) => apiPost('/api/v1/finance/categories', v)}
    />
  );
}

export function KategoriEditButton({ row }: { row: KategoriRow }) {
  return (
    <AutoForm
      title="Edit Kategori"
      fields={FIELDS}
      initial={{ nama: row.nama, tipe: row.tipe }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/finance/categories/${row.id}`, v)}
    />
  );
}

export function KategoriDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/finance/categories/${id}`)} />;
}
