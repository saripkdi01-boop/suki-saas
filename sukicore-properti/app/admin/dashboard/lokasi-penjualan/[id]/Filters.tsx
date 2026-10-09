'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui';

/** Filter status via URL search params. */
export function StatusFilter({ statuses }: { statuses: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set('status_id', value);
    else p.delete('status_id');
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <Select value={sp.get('status_id') ?? ''} onChange={(e) => set(e.target.value)} className="w-52">
      <option value="">Semua Status</option>
      {statuses.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
