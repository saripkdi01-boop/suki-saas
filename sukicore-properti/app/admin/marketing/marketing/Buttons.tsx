'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface MarketingRow {
  id: number;
  kode: string;
  nama: string;
  alamat: string | null;
  no_rekening: string | null;
  is_active: boolean;
}

const FIELDS: AutoField[] = [
  { name: 'kode', label: 'Kode', type: 'text', required: true, placeholder: 'cth: MKT-001' },
  { name: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama lengkap marketing' },
  { name: 'alamat', label: 'Alamat', type: 'textarea' },
  { name: 'no_rekening', label: 'No. Rekening', type: 'text', placeholder: 'cth: 1234567890' },
  { name: 'is_active', label: 'Aktif', type: 'checkbox' },
];

export function MarketingCreateButton() {
  return (
    <AutoForm
      title="Tambah Marketing"
      fields={FIELDS}
      initial={{ is_active: true }}
      triggerLabel="Tambah Marketing"
      onSubmit={async (v) => apiPost('/api/v1/marketing', v)}
    />
  );
}

export function MarketingEditButton({ row }: { row: MarketingRow }) {
  return (
    <AutoForm
      title="Edit Marketing"
      fields={FIELDS}
      initial={{
        kode: row.kode,
        nama: row.nama,
        alamat: row.alamat ?? '',
        no_rekening: row.no_rekening ?? '',
        is_active: row.is_active,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/marketing/${row.id}`, v)}
    />
  );
}

export function MarketingDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/marketing/${id}`)} />;
}
