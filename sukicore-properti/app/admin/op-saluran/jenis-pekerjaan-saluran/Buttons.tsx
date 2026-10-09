'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, Select } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface Option {
  value: string;
  label: string;
}

export interface WorkTypeRow {
  id: number;
  project_id: number;
  nama: string;
  bobot_persen: number | string | null;
  progress: number;
}

export function ParamSelect({
  param,
  options,
  placeholder,
}: {
  param: string;
  options: Option[];
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(sp.toString());
    const v = e.target.value;
    if (v) params.set(param, v);
    else params.delete(param);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };
  return (
    <Select value={sp.get(param) ?? ''} onChange={onChange} className="w-72">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

const FIELDS: AutoField[] = [
  { name: 'nama', label: 'Nama Pekerjaan', type: 'text', required: true, placeholder: 'cth: Pek. Finishing Saluran' },
  { name: 'bobot_persen', label: 'Bobot (%)', type: 'number', min: 0, step: '0.01' },
  { name: 'progress', label: 'Progress (%)', type: 'number', min: 0 },
];

export function JenisPekerjaanSaluranCreateButton({ projectId }: { projectId: string }) {
  return (
    <AutoForm
      title="Tambah Jenis Pekerjaan"
      fields={FIELDS}
      initial={{ progress: 0, bobot_persen: 0 }}
      triggerLabel="Tambah Pekerjaan"
      onSubmit={async (v) => apiPost('/api/v1/op-saluran/work-types', { ...v, project_id: Number(projectId) })}
    />
  );
}

export function JenisPekerjaanSaluranEditButton({ row, projectId }: { row: WorkTypeRow; projectId: string }) {
  return (
    <AutoForm
      title="Edit Jenis Pekerjaan"
      fields={FIELDS}
      initial={{
        nama: row.nama,
        bobot_persen: row.bobot_persen === null || row.bobot_persen === undefined ? '' : String(row.bobot_persen),
        progress: row.progress,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/op-saluran/work-types/${row.id}`, { ...v, project_id: Number(projectId) })}
    />
  );
}

export function JenisPekerjaanSaluranDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/op-saluran/work-types/${id}`)} />;
}
