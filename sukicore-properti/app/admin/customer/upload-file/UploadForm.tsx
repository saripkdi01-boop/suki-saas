'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DeleteButton, Button, Field, Input, Select, toast } from '@/components/ui';
import { apiDelete } from '@/lib/client-api';

export function CustomerPicker({
  customers,
  initialId,
}: {
  customers: { id: number; nama_lengkap: string }[];
  initialId: string;
}) {
  const router = useRouter();
  const [val, setVal] = useState(initialId);
  return (
    <Field label="Customer">
      <Select
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          router.push(
            e.target.value
              ? `/admin/customer/upload-file?customer_id=${encodeURIComponent(e.target.value)}`
              : '/admin/customer/upload-file'
          );
        }}
      >
        <option value="">— Pilih customer —</option>
        {customers.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.nama_lengkap}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function UploadForm({
  customerId,
  customerName,
}: {
  customerId: number;
  customerName: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast('File wajib dipilih.', 'err');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('customer_id', String(customerId));
      form.append('keterangan', keterangan);
      form.append('file', file);
      const res = await fetch('/api/v1/customers/files', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        toast(json?.error?.message ?? 'Gagal mengunggah file.', 'err');
        return;
      }
      toast('File berhasil diunggah.');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Upload File{customerName ? ` — ${customerName}` : ''}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="File">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300 dark:text-slate-300 dark:file:bg-slate-700 dark:hover:file:bg-slate-600"
          />
        </Field>
        <Field label="Keterangan">
          <Input
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="cth: Scan KTP"
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button type="submit" disabled={busy}>
          {busy ? 'Mengunggah…' : 'Upload'}
        </Button>
      </div>
    </form>
  );
}

export function FileDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/customers/files/${id}`)} />;
}
