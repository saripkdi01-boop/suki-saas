'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface ProspekRow {
  id: number;
  nama_lengkap: string;
  no_hp: string | null;
  alamat: string | null;
  sumber: string | null;
  status: string;
  location_id: number | null;
  marketing_id: number | null;
}

export interface ProspekFormOptions {
  location: { value: string; label: string }[];
  marketing: { value: string; label: string }[];
}

function makeFields(o: ProspekFormOptions): AutoField[] {
  return [
    { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', required: true, placeholder: 'Nama lengkap prospek' },
    { name: 'no_hp', label: 'No. HP', type: 'text', placeholder: 'cth: 0812…' },
    { name: 'alamat', label: 'Alamat', type: 'textarea' },
    { name: 'sumber', label: 'Sumber', type: 'text', placeholder: 'cth: iklan, referral, pameran' },
    { name: 'location_id', label: 'Lokasi', type: 'select', options: o.location },
    { name: 'marketing_id', label: 'Marketing', type: 'select', options: o.marketing },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'baru', label: 'Baru' },
        { value: 'follow_up', label: 'Follow Up' },
        { value: 'deal', label: 'Deal' },
        { value: 'batal', label: 'Batal' },
      ],
    },
  ];
}

export function ProspekCreateButton({ options }: { options: ProspekFormOptions }) {
  return (
    <AutoForm
      title="Tambah Prospek"
      fields={makeFields(options)}
      initial={{ status: 'baru' }}
      triggerLabel="Tambah Prospek"
      onSubmit={async (v) => apiPost('/api/v1/prospects', v)}
    />
  );
}

export function ProspekEditButton({ row, options }: { row: ProspekRow; options: ProspekFormOptions }) {
  return (
    <AutoForm
      title="Edit Prospek"
      fields={makeFields(options)}
      initial={{
        nama_lengkap: row.nama_lengkap,
        no_hp: row.no_hp ?? '',
        alamat: row.alamat ?? '',
        sumber: row.sumber ?? '',
        location_id: row.location_id !== null ? String(row.location_id) : '',
        marketing_id: row.marketing_id !== null ? String(row.marketing_id) : '',
        status: row.status ?? 'baru',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/prospects/${row.id}`, v)}
    />
  );
}

export function ProspekDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/prospects/${id}`)} />;
}
