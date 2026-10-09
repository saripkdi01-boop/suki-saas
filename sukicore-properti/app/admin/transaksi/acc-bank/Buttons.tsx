'use client';

import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

type Opt = { value: string; label: string };

interface ApprovalEditRow {
  id: number;
  customer_id: number;
  plafon_acc: number | string | null;
  tgl_sp3k: string; // sudah YYYY-MM-DD via toDateInput di page
  tgl_expired: string;
  keterangan: string | null;
}

const APPROVAL_FIELDS = (customers: Opt[]): AutoField[] => [
  { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers },
  { name: 'plafon_acc', label: 'Plafon ACC', type: 'number', min: 0, step: '1000', placeholder: 'cth: 250000000' },
  { name: 'tgl_sp3k', label: 'Tgl SP3K', type: 'date' },
  { name: 'tgl_expired', label: 'Tgl Expired', type: 'date' },
  { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
];

export function AccBankCreateButton({ customers }: { customers: Opt[] }) {
  return (
    <AutoForm
      title="Tambah Persetujuan Bank"
      fields={APPROVAL_FIELDS(customers)}
      triggerLabel="Tambah ACC Bank"
      onSubmit={async (v) => apiPost('/api/v1/bank-approvals', v)}
    />
  );
}

export function AccBankEditButton({ customers, row }: { customers: Opt[]; row: ApprovalEditRow }) {
  return (
    <AutoForm
      title="Edit Persetujuan Bank"
      fields={APPROVAL_FIELDS(customers)}
      initial={{
        customer_id: String(row.customer_id),
        plafon_acc: row.plafon_acc ?? '',
        tgl_sp3k: row.tgl_sp3k,
        tgl_expired: row.tgl_expired,
        keterangan: row.keterangan ?? '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={async (v) => apiPut(`/api/v1/bank-approvals/${row.id}`, v)}
    />
  );
}

export function AccBankDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/bank-approvals/${id}`)} />;
}

const SP3K_FIELDS = (customers: Opt[], banks: Opt[]): AutoField[] => [
  { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: customers },
  { name: 'tanggal_pencairan', label: 'Tgl Pencairan', type: 'date' },
  { name: 'nominal', label: 'Nominal', type: 'number', min: 0, step: '1000', placeholder: 'cth: 250000000' },
  { name: 'bank_kpr_id', label: 'Bank KPR', type: 'select', options: banks },
  { name: 'keterangan', label: 'Keterangan', type: 'textarea' },
];

export function Sp3kCreateButton({ customers, banks }: { customers: Opt[]; banks: Opt[] }) {
  return (
    <AutoForm
      title="Catat SP3K / Pencairan Kredit"
      fields={SP3K_FIELDS(customers, banks)}
      triggerLabel="Catat SP3K"
      wide
      onSubmit={async (v) => apiPost('/api/v1/sp3k', v)}
    />
  );
}

export function Sp3kDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/sp3k/${id}`)} />;
}
