'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface Option {
  value: string;
  label: string;
}

export interface UtilityRow {
  id: number;
  unit_id: number;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  no_rekening_listrik: string | null;
  foto_url?: string | null;
}

function createFields(units: Option[]): AutoField[] {
  return [
    { name: 'unit_id', label: 'Unit', type: 'select', required: true, options: units },
    { name: 'listrik_terpasang', label: 'Listrik Terpasang', type: 'checkbox' },
    { name: 'air_terpasang', label: 'Air Terpasang', type: 'checkbox' },
    { name: 'no_rekening_listrik', label: 'No. Rekening Listrik', type: 'text', placeholder: 'cth: 1234567890' },
    { name: 'foto_url', label: 'Foto (URL)', type: 'text', placeholder: 'https://…' },
  ];
}

const EDIT_FIELDS: AutoField[] = [
  { name: 'listrik_terpasang', label: 'Listrik Terpasang', type: 'checkbox' },
  { name: 'air_terpasang', label: 'Air Terpasang', type: 'checkbox' },
  { name: 'no_rekening_listrik', label: 'No. Rekening Listrik', type: 'text', placeholder: 'cth: 1234567890' },
  { name: 'foto_url', label: 'Foto (URL)', type: 'text', placeholder: 'https://…' },
];

export function ListrikAirCreateButton({ units }: { units: Option[] }) {
  return (
    <AutoForm
      title="Tambah Status Listrik & Air"
      fields={createFields(units)}
      triggerLabel="Tambah Data"
      onSubmit={async (v) => apiPost('/api/v1/legal/utility', v)}
    />
  );
}

export function ListrikAirEditButton({ row }: { row: UtilityRow }) {
  return (
    <AutoForm
      title="Edit Status Listrik & Air"
      fields={EDIT_FIELDS}
      initial={{
        listrik_terpasang: row.listrik_terpasang,
        air_terpasang: row.air_terpasang,
        no_rekening_listrik: row.no_rekening_listrik ?? '',
        foto_url: row.foto_url ?? '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/legal/utility/${row.id}`, { ...v, unit_id: row.unit_id })}
    />
  );
}

export function ListrikAirDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/legal/utility/${id}`)} />;
}
