'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

type Opt = { value: string; label: string };

const SCHEDULE_FIELDS: AutoField[] = [
  { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
  { name: 'keterangan', label: 'Keterangan', type: 'textarea', placeholder: 'cth: Akad massal batch 3' },
];

export function AkadScheduleCreateButton() {
  return (
    <AutoForm
      title="Tambah Jadwal Akad"
      fields={SCHEDULE_FIELDS}
      triggerLabel="Tambah Jadwal"
      onSubmit={async (v) => apiPost('/api/v1/akad-schedules', v)}
    />
  );
}

export function AkadScheduleEditButton({
  row,
}: {
  row: { id: number; tanggal: string; keterangan: string | null };
}) {
  return (
    <AutoForm
      title="Edit Jadwal Akad"
      fields={SCHEDULE_FIELDS}
      initial={{ tanggal: row.tanggal, keterangan: row.keterangan ?? '' }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/akad-schedules/${row.id}`, v)}
    />
  );
}

export function AkadScheduleDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/akad-schedules/${id}`)} />;
}

export function ParticipantAddButton({
  scheduleId,
  customers,
}: {
  scheduleId: number;
  customers: Opt[];
}) {
  const fields: AutoField[] = [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers },
  ];
  return (
    <AutoForm
      title="Tambah Peserta Akad"
      fields={fields}
      triggerLabel="Tambah Peserta"
      onSubmit={async (v) => apiPost(`/api/v1/akad-schedules/${scheduleId}/participants`, v)}
    />
  );
}

export function ParticipantDeleteButton({
  scheduleId,
  customerId,
}: {
  scheduleId: number;
  customerId: number;
}) {
  return (
    <DeleteButton
      onDelete={() => apiDelete(`/api/v1/akad-schedules/${scheduleId}/participants?customer_id=${customerId}`)}
    />
  );
}
