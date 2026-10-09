'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

interface Opt {
  value: string;
  label: string;
}

function fields(satuanOpts: Opt[]): AutoField[] {
  return [
    { name: 'kode', label: 'Kode Barang', type: 'text', required: true, placeholder: 'cth: SMN-001' },
    { name: 'nama', label: 'Nama Barang', type: 'text', required: true, placeholder: 'cth: Semen 50kg' },
    { name: 'satuan_id', label: 'Satuan', type: 'select', options: satuanOpts },
    { name: 'stok', label: 'Stok', type: 'number', min: 0 },
    { name: 'harga_beli', label: 'Harga Beli (Rp)', type: 'number', placeholder: 'cth: 65000' },
  ];
}

export function BarangCreateButton({ satuanOpts }: { satuanOpts: Opt[] }) {
  return (
    <AutoForm
      title="Tambah Barang"
      fields={fields(satuanOpts)}
      triggerLabel="Tambah Barang"
      onSubmit={async (v) => apiPost('/api/v1/masters/barang', v)}
    />
  );
}

export function BarangEditButton({
  row,
  satuanOpts,
}: {
  row: { id: number; kode: string; nama: string; satuan_id: number | null; stok: number; harga_beli: number | null };
  satuanOpts: Opt[];
}) {
  return (
    <AutoForm
      title="Edit Barang"
      fields={fields(satuanOpts)}
      initial={{
        kode: row.kode,
        nama: row.nama,
        satuan_id: row.satuan_id ? String(row.satuan_id) : '',
        stok: row.stok,
        harga_beli: row.harga_beli,
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/masters/barang/${row.id}`, v)}
    />
  );
}

export function BarangDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/masters/barang/${id}`)} />;
}
