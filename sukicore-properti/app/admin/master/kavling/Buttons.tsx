'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, Select } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

interface Opt {
  value: string;
  label: string;
}

type KavlingRow = {
  id: number;
  kode_kavling: string;
  location_id: number;
  status_id: number | null;
  pjg_kanan: number | null;
  pjg_kiri: number | null;
  lbr_depan: number | null;
  lbr_belakang: number | null;
  luas_tanah: number | null;
  luas_bangunan: number | null;
  harga_jual: number | null;
  daya_listrik: string | null;
  no_sertifikat: string | null;
  keterangan: string | null;
  progres_bangunan: number;
  is_ready: boolean;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
};

function fields(locOpts: Opt[], statOpts: Opt[]): AutoField[] {
  return [
    { name: 'location_id', label: 'Lokasi', type: 'select', required: true, options: locOpts },
    { name: 'kode_kavling', label: 'Kode Kavling', type: 'text', required: true, placeholder: 'cth: A-12' },
    { name: 'status_id', label: 'Status', type: 'select', options: statOpts },
    { name: 'harga_jual', label: 'Harga Jual (Rp)', type: 'number', placeholder: 'cth: 185000000' },
    { name: 'luas_tanah', label: 'Luas Tanah (m²)', type: 'number', step: '0.01' },
    { name: 'luas_bangunan', label: 'Luas Bangunan (m²)', type: 'number', step: '0.01' },
    { name: 'pjg_kanan', label: 'Panjang Kanan (m)', type: 'number', step: '0.01' },
    { name: 'pjg_kiri', label: 'Panjang Kiri (m)', type: 'number', step: '0.01' },
    { name: 'lbr_depan', label: 'Lebar Depan (m)', type: 'number', step: '0.01' },
    { name: 'lbr_belakang', label: 'Lebar Belakang (m)', type: 'number', step: '0.01' },
    { name: 'daya_listrik', label: 'Daya Listrik', type: 'text', placeholder: 'cth: 1300 VA' },
    { name: 'no_sertifikat', label: 'No. Sertifikat', type: 'text' },
    { name: 'progres_bangunan', label: 'Progres Bangunan (%)', type: 'number', min: 0 },
    { name: 'is_ready', label: 'Unit Ready', type: 'checkbox' },
    { name: 'listrik_terpasang', label: 'Listrik Terpasang', type: 'checkbox' },
    { name: 'air_terpasang', label: 'Air Terpasang', type: 'checkbox' },
    { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
  ];
}

function initialOf(row: KavlingRow): Record<string, string | number | boolean | null | undefined> {
  return {
    location_id: String(row.location_id),
    kode_kavling: row.kode_kavling,
    status_id: row.status_id ? String(row.status_id) : '',
    harga_jual: row.harga_jual,
    luas_tanah: row.luas_tanah,
    luas_bangunan: row.luas_bangunan,
    pjg_kanan: row.pjg_kanan,
    pjg_kiri: row.pjg_kiri,
    lbr_depan: row.lbr_depan,
    lbr_belakang: row.lbr_belakang,
    daya_listrik: row.daya_listrik,
    no_sertifikat: row.no_sertifikat,
    progres_bangunan: row.progres_bangunan,
    is_ready: row.is_ready,
    listrik_terpasang: row.listrik_terpasang,
    air_terpasang: row.air_terpasang,
    keterangan: row.keterangan,
  };
}

export function KavlingCreateButton({ locOpts, statOpts }: { locOpts: Opt[]; statOpts: Opt[] }) {
  return (
    <AutoForm
      title="Tambah Kavling"
      fields={fields(locOpts, statOpts)}
      triggerLabel="Tambah Kavling"
      wide
      onSubmit={async (v) => apiPost('/api/v1/masters/kavling', v)}
    />
  );
}

export function KavlingEditButton({
  row,
  locOpts,
  statOpts,
}: {
  row: KavlingRow;
  locOpts: Opt[];
  statOpts: Opt[];
}) {
  return (
    <AutoForm
      title={`Edit Kavling ${row.kode_kavling}`}
      fields={fields(locOpts, statOpts)}
      initial={initialOf(row)}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/masters/kavling/${row.id}`, v)}
    />
  );
}

export function KavlingDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/kavling/${id}`)} />;
}

/** Filter lokasi + status via URL search params. */
export function KavlingFilters({ locOpts, statOpts }: { locOpts: Opt[]; statOpts: Opt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = (key: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <>
      <Select value={sp.get('location_id') ?? ''} onChange={(e) => set('location_id', e.target.value)} className="w-52">
        <option value="">Semua Lokasi</option>
        {locOpts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select value={sp.get('status_id') ?? ''} onChange={(e) => set('status_id', e.target.value)} className="w-52">
        <option value="">Semua Status</option>
        {statOpts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </>
  );
}
