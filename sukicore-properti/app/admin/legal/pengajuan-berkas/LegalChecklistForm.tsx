'use client';

import { useState } from 'react';
import { Button, Field, Select, Textarea, Modal, toast } from '@/components/ui';
import { apiPost, apiPut } from '@/lib/client-api';

export interface Option {
  value: string;
  label: string;
}

export interface ChecklistInitial {
  id: number;
  unit_id: number | null;
  iph: boolean;
  shgb: boolean;
  ssp: boolean;
  bphtb: boolean;
  sikumbang: boolean;
  daftar_sikasep: boolean;
  foto_sikasep: boolean;
  trilogi: boolean;
  catatan: string | null;
}

const DOCS: { name: keyof Omit<ChecklistInitial, 'id' | 'unit_id' | 'catatan'>; label: string }[] = [
  { name: 'iph', label: 'IPH' },
  { name: 'shgb', label: 'SHGB' },
  { name: 'ssp', label: 'SSP' },
  { name: 'bphtb', label: 'BPHTB' },
  { name: 'sikumbang', label: 'SiKumbang' },
  { name: 'daftar_sikasep', label: 'Daftar SiKasep' },
  { name: 'foto_sikasep', label: 'Foto SiKasep' },
  { name: 'trilogi', label: 'Trilogi' },
];

export function LegalChecklistForm({
  customerId,
  units,
  initial,
  triggerLabel = 'Tambah Checklist',
}: {
  customerId: string;
  units: Option[];
  initial?: ChecklistInitial;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string | number | boolean | null> = {
      customer_id: Number(customerId),
      unit_id: Number(fd.get('unit_id')),
      catatan: (fd.get('catatan') as string) || null,
    };
    for (const d of DOCS) values[d.name] = fd.get(d.name) === 'on';
    setBusy(true);
    const r = initial
      ? await apiPut(`/api/v1/legal/checklists/${initial.id}`, values)
      : await apiPost('/api/v1/legal/checklists', values);
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal menyimpan.', 'err');
      return;
    }
    toast('Checklist tersimpan.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      {initial ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          <Button variant="secondary">Edit</Button>
        </span>
      ) : (
        <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? 'Edit Checklist Berkas' : 'Tambah Checklist Berkas'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Unit *">
            <Select name="unit_id" defaultValue={initial?.unit_id ? String(initial.unit_id) : ''} required>
              <option value="">— Pilih Unit —</option>
              {units.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dokumen</span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DOCS.map((d) => (
                <label
                  key={d.name}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    name={d.name}
                    defaultChecked={Boolean(initial?.[d.name])}
                    className="h-5 w-5 rounded accent-emerald-600"
                  />
                  <span className="text-slate-800 dark:text-slate-200">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Field label="Catatan">
            <Textarea name="catatan" defaultValue={initial?.catatan ?? ''} rows={3} placeholder="Catatan tambahan…" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
