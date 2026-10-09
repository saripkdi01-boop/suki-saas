'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DeleteButton, Select } from '@/components/ui';
import { apiDelete } from '@/lib/client-api';

export interface Option {
  value: string;
  label: string;
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

export function ChecklistDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/legal/checklists/${id}`)} />;
}
