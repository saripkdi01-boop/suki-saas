'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, Select } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface Option {
  value: string;
  label: string;
}

export interface JalanRow {
  id: number;
  project_id: number;
  nama: string;
  panjang_m: number | string | null;
  lebar_m: number | string | null;
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
  { name: 'nama', label: 'Nama Jalan', type: 'text', required: true, placeholder: 'cth: Jl. Utama Blok A' },
  { name: 'panjang_m', label: 'Panjang (meter)', type: 'number', min: 0, step: '0.01' },
  { name: 'lebar_m', label: 'Lebar (meter)', type: 'number', min: 0, step: '0.01' },
];

export function JalanCreateButton({ projectId }: { projectId: string }) {
  return (
    <AutoForm
      title="Tambah Jalan"
      fields={FIELDS}
      triggerLabel="Tambah Jalan"
      onSubmit={async (v) => apiPost('/api/v1/op-jalan/roads', { ...v, project_id: Number(projectId) })}
    />
  );
}

export function JalanEditButton({ row, projectId }: { row: JalanRow; projectId: string }) {
  return (
    <AutoForm
      title="Edit Jalan"
      fields={FIELDS}
      initial={{
        nama: row.nama,
        panjang_m: row.panjang_m === null || row.panjang_m === undefined ? '' : String(row.panjang_m),
        lebar_m: row.lebar_m === null || row.lebar_m === undefined ? '' : String(row.lebar_m),
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/op-jalan/roads/${row.id}`, { ...v, project_id: Number(projectId) })}
    />
  );
}

export function JalanDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/op-jalan/roads/${id}`)} />;
}
