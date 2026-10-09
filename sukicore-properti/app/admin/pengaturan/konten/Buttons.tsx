'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

const POSISI = [
  { value: 'navbar', label: 'Navbar' },
  { value: 'slider', label: 'Slider' },
  { value: 'produk', label: 'Produk' },
  { value: 'siteplan', label: 'Siteplan' },
  { value: 'kontak', label: 'Kontak' },
  { value: 'lainnya', label: 'Lainnya' },
];

const FIELDS: AutoField[] = [
  { name: 'key', label: 'Key', type: 'text', required: true, placeholder: 'cth: navbar-telepon' },
  { name: 'judul', label: 'Judul', type: 'text', required: true, placeholder: 'cth: Nomor Telepon Navbar' },
  { name: 'posisi', label: 'Posisi', type: 'select', options: POSISI },
  { name: 'isi_html', label: 'Isi HTML', type: 'textarea', placeholder: 'Konten HTML…' },
];

interface KontenRow {
  id: number;
  key: string;
  judul: string;
  isi_html: string | null;
  posisi: string | null;
}

export function KontenCreateButton() {
  return (
    <AutoForm
      title="Tambah Konten"
      fields={FIELDS}
      initial={{ posisi: 'lainnya' }}
      triggerLabel="Tambah Konten"
      wide
      onSubmit={(v) => apiPost('/api/v1/settings/cms', v)}
    />
  );
}

export function KontenEditButton({ row }: { row: KontenRow }) {
  return (
    <AutoForm
      title={`Edit Konten — ${row.key}`}
      fields={FIELDS}
      initial={{ key: row.key, judul: row.judul, posisi: row.posisi ?? 'lainnya', isi_html: row.isi_html ?? '' }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={(v) => apiPut(`/api/v1/settings/cms/${row.id}`, v)}
    />
  );
}

export function KontenDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/settings/cms/${id}`)} />;
}
