'use client';

import { useState } from 'react';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, toast } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

export interface Opt {
  value: string;
  label: string;
}

export interface HoldRow {
  id: number;
  unit_id: number;
  customer_id: number | null;
  jumlah: number | string | null;
  lampiran_url: string | null;
  catatan: string | null;
}

function fields(unitOpts: Opt[], customerOpts: Opt[]): AutoField[] {
  return [
    { name: 'unit_id', label: 'Unit', type: 'select', required: true, options: unitOpts },
    { name: 'customer_id', label: 'Customer', type: 'select', options: customerOpts },
    { name: 'jumlah', label: 'Jumlah (Rp)', type: 'number', min: 0, step: 'any', placeholder: 'cth: 2000000' },
    { name: 'lampiran_url', label: 'URL Lampiran', type: 'text', placeholder: 'https://…' },
    { name: 'catatan', label: 'Catatan', type: 'textarea' },
  ];
}

export function HoldCreateButton({ unitOpts, customerOpts }: { unitOpts: Opt[]; customerOpts: Opt[] }) {
  return (
    <AutoForm
      title="Ajukan Hold Unit"
      fields={fields(unitOpts, customerOpts)}
      triggerLabel="Ajukan Hold"
      wide
      onSubmit={async (v) => apiPost('/api/v1/holds', v)}
    />
  );
}

export function HoldEditButton({
  row,
  unitOpts,
  customerOpts,
}: {
  row: HoldRow;
  unitOpts: Opt[];
  customerOpts: Opt[];
}) {
  return (
    <AutoForm
      title="Edit Pengajuan Hold"
      fields={fields(unitOpts, customerOpts)}
      initial={{
        unit_id: row.unit_id ? String(row.unit_id) : '',
        customer_id: row.customer_id ? String(row.customer_id) : '',
        jumlah: row.jumlah,
        lampiran_url: row.lampiran_url ?? '',
        catatan: row.catatan ?? '',
      }}
      trigger={<Button variant="secondary">Edit</Button>}
      wide
      onSubmit={async (v) => apiPut(`/api/v1/holds/${row.id}`, v)}
    />
  );
}

export function HoldVerifyButtons({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);

  const verify = async (approve: boolean) => {
    if (busy) return;
    const ok = window.confirm(
      approve ? 'Setujui pengajuan hold ini? Status unit akan menjadi Booking.' : 'Tolak pengajuan hold ini?'
    );
    if (!ok) return;
    setBusy(true);
    const r = await apiPost(`/api/v1/holds/${id}/verify`, { approve });
    setBusy(false);
    toast(r.ok ? (approve ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.') : r.error ?? 'Gagal memverifikasi.', r.ok ? 'ok' : 'err');
    if (r.ok) window.location.reload();
  };

  return (
    <>
      <Button variant="success" disabled={busy} onClick={() => verify(true)}>
        Setujui
      </Button>
      <Button variant="secondary" disabled={busy} onClick={() => verify(false)}>
        Tolak
      </Button>
    </>
  );
}

export function HoldDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/holds/${id}`)} />;
}
