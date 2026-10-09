'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

interface Opt {
  value: string;
  label: string;
}

function fields(companyOpts: Opt[]): AutoField[] {
  return [
    { name: 'kode', label: 'Kode Lokasi', type: 'text', required: true, placeholder: 'cth: BSK' },
    { name: 'nama', label: 'Nama Lokasi', type: 'text', required: true, placeholder: 'cth: BUMI SAMARKAND' },
    { name: 'company_id', label: 'Perusahaan', type: 'select', options: companyOpts },
    { name: 'alamat', label: 'Alamat', type: 'textarea', placeholder: 'Alamat lokasi perumahan' },
  ];
}

export function LokasiCreateButton({ companyOpts }: { companyOpts: Opt[] }) {
  return (
    <AutoForm
      title="Tambah Lokasi"
      fields={fields(companyOpts)}
      triggerLabel="Tambah Lokasi"
      onSubmit={async (v) => apiPost('/api/v1/masters/lokasi-kavling', v)}
    />
  );
}

export function LokasiEditButton({
  row,
  companyOpts,
}: {
  row: { id: number; kode: string; nama: string; alamat: string | null; company_id: number | null };
  companyOpts: Opt[];
}) {
  return (
    <AutoForm
      title="Edit Lokasi"
      fields={fields(companyOpts)}
      initial={{ kode: row.kode, nama: row.nama, company_id: row.company_id ? String(row.company_id) : '', alamat: row.alamat }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/lokasi-kavling/${row.id}`, v)}
    />
  );
}

export function LokasiDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/lokasi-kavling/${id}`)} />;
}
