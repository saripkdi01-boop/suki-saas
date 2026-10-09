'use client';

import React, { useState } from 'react';
import { Button, Field, Input, Select, Textarea, Modal, toast } from './ui';
import { cx } from '@/lib/format';

export interface AutoField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  step?: string;
  readonly?: boolean;
}

/**
 * Form modal generik untuk CRUD cepat.
 * onSubmit menerima values { [name]: string|number|boolean } dan mengembalikan { ok, error? }.
 */
export function AutoForm({
  title,
  fields,
  initial,
  onSubmit,
  trigger,
  triggerLabel = 'Tambah',
  triggerVariant = 'primary',
  wide,
}: {
  title: string;
  fields: AutoField[];
  initial?: Record<string, string | number | boolean | null | undefined>;
  onSubmit: (values: Record<string, string | number | boolean | null>) => Promise<{ ok: boolean; error?: string }>;
  trigger?: React.ReactNode;
  triggerLabel?: string;
  triggerVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string | number | boolean | null> = {};
    for (const f of fields) {
      const raw = fd.get(f.name);
      if (f.type === 'checkbox') values[f.name] = raw === 'on';
      else if (f.type === 'number') values[f.name] = raw === '' || raw === null ? null : Number(raw);
      else values[f.name] = raw === null ? null : String(raw);
    }
    setBusy(true);
    const r = await onSubmit(values);
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal menyimpan.', 'err');
      return;
    }
    toast('Data tersimpan.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">{trigger}</span>
      ) : (
        <Button variant={triggerVariant} onClick={() => setOpen(true)}>{triggerLabel}</Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={title} wide={wide}>
        <form onSubmit={submit} className={cx('space-y-4', wide && 'grid grid-cols-1 gap-4 sm:grid-cols-2 space-y-0')}>
          {fields.map((f) => {
            const val = initial?.[f.name];
            const defVal = val === null || val === undefined ? '' : String(val);
            return (
              <Field key={f.name} label={f.label + (f.required ? ' *' : '')}>
                {f.type === 'textarea' ? (
                  <Textarea name={f.name} defaultValue={defVal} required={f.required} placeholder={f.placeholder} rows={3} readOnly={f.readonly} />
                ) : f.type === 'select' ? (
                  <Select name={f.name} defaultValue={defVal} required={f.required} disabled={f.readonly}>
                    <option value="">— Pilih —</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" name={f.name} defaultChecked={Boolean(val)} className="h-5 w-5 rounded accent-emerald-600" disabled={f.readonly} />
                ) : (
                  <Input
                    name={f.name}
                    type={f.type}
                    defaultValue={defVal}
                    required={f.required}
                    placeholder={f.placeholder}
                    min={f.min}
                    step={f.step}
                    readOnly={f.readonly}
                  />
                )}
              </Field>
            );
          })}
          <div className={cx('flex justify-end gap-2 pt-2', wide && 'sm:col-span-2')}>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
