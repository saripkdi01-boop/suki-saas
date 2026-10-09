'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';
import { toDateInput } from '@/lib/format';

export interface CustomerRow {
  id: number;
  nama_lengkap: string;
  nik: string | null;
  no_hp: string | null;
  tempat_lahir: string | null;
  tgl_lahir: string | null;
  jenis_kelamin: string | null;
  alamat_ktp: string | null;
  alamat_domisili: string | null;
  npwp: string | null;
  jenis_pembelian: string | null;
  marketing_id: number | null;
  admin_id: number | null;
  unit_id: number | null;
  status_id: number | null;
}

export interface CustomerFormOptions {
  marketing: { value: string; label: string }[];
  admin: { value: string; label: string }[];
  unit: { value: string; label: string }[];
  status: { value: string; label: string }[];
}

function makeFields(o: CustomerFormOptions): AutoField[] {
  return [
    { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', required: true, placeholder: 'Nama lengkap customer' },
    { name: 'nik', label: 'NIK', type: 'text', placeholder: '16 digit' },
    { name: 'no_hp', label: 'No. HP', type: 'text', placeholder: 'cth: 0812…' },
    { name: 'tempat_lahir', label: 'Tempat Lahir', type: 'text' },
    { name: 'tgl_lahir', label: 'Tanggal Lahir', type: 'date' },
    { name: 'jenis_kelamin', label: 'Jenis Kelamin', type: 'select', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] },
    { name: 'alamat_ktp', label: 'Alamat KTP', type: 'textarea' },
    { name: 'alamat_domisili', label: 'Alamat Domisili', type: 'textarea' },
    { name: 'npwp', label: 'NPWP', type: 'text' },
    { name: 'jenis_pembelian', label: 'Jenis Pembelian', type: 'select', options: [{ value: 'KPR', label: 'KPR' }, { value: 'Cash', label: 'Cash' }] },
    { name: 'marketing_id', label: 'Marketing', type: 'select', options: o.marketing },
    { name: 'admin_id', label: 'Admin Pemberkasan', type: 'select', options: o.admin },
    { name: 'unit_id', label: 'Unit (Ready)', type: 'select', options: o.unit },
    { name: 'status_id', label: 'Status', type: 'select', options: o.status },
  ];
}

export function CustomerCreateButton({ options }: { options: CustomerFormOptions }) {
  return (
    <AutoForm
      wide
      title="Tambah Customer"
      fields={makeFields(options)}
      initial={{ jenis_pembelian: 'KPR' }}
      triggerLabel="Tambah Customer"
      onSubmit={async (v) => apiPost('/api/v1/customers', v)}
    />
  );
}

export function CustomerEditButton({ row, options }: { row: CustomerRow; options: CustomerFormOptions }) {
  return (
    <AutoForm
      wide
      title="Edit Customer"
      fields={makeFields(options)}
      initial={{
        nama_lengkap: row.nama_lengkap,
        nik: row.nik ?? '',
        no_hp: row.no_hp ?? '',
        tempat_lahir: row.tempat_lahir ?? '',
        tgl_lahir: toDateInput(row.tgl_lahir),
        jenis_kelamin: row.jenis_kelamin ?? '',
        alamat_ktp: row.alamat_ktp ?? '',
        alamat_domisili: row.alamat_domisili ?? '',
        npwp: row.npwp ?? '',
        jenis_pembelian: row.jenis_pembelian ?? 'KPR',
        marketing_id: row.marketing_id !== null ? String(row.marketing_id) : '',
        admin_id: row.admin_id !== null ? String(row.admin_id) : '',
        unit_id: row.unit_id !== null ? String(row.unit_id) : '',
        status_id: row.status_id !== null ? String(row.status_id) : '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/customers/${row.id}`, v)}
    />
  );
}

export function CustomerDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/customers/${id}`)} />;
}
