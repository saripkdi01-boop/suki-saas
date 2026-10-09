'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

interface Opt {
  value: string;
  label: string;
}

const STATUS_OPTS: Opt[] = [
  { value: 'terbuka', label: 'Terbuka' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
];

function fields(custOpts: Opt[]): AutoField[] {
  return [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: custOpts },
    { name: 'judul', label: 'Judul', type: 'text', required: true, placeholder: 'cth: Kebocoran atap' },
    { name: 'isi', label: 'Isi Aduan', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTS },
  ];
}

export function AduanCreateButton({ custOpts }: { custOpts: Opt[] }) {
  return (
    <AutoForm
      title="Tambah Aduan"
      fields={fields(custOpts)}
      initial={{ status: 'terbuka' }}
      triggerLabel="Tambah Aduan"
      onSubmit={async (v) => apiPost('/api/v1/complaints', v)}
    />
  );
}

export function AduanEditButton({
  row,
  custOpts,
}: {
  row: { id: number; customer_id: number; judul: string; isi: string | null; status: string };
  custOpts: Opt[];
}) {
  return (
    <AutoForm
      title="Edit Aduan"
      fields={fields(custOpts)}
      initial={{
        customer_id: String(row.customer_id),
        judul: row.judul,
        isi: row.isi ?? '',
        status: row.status,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/complaints/${row.id}`, v)}
    />
  );
}

export function AduanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/complaints/${id}`)} />;
}
