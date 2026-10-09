'use client';

import { useState } from 'react';
import { Button, Field, Input, Textarea, toast } from '@/components/ui';
import { apiPut } from '@/lib/client-api';

export interface ProfilInitial {
  nama: string;
  alamat: string;
  telepon: string;
  email: string;
}

export function ProfilForm({ initial }: { initial: ProfilInitial }) {
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const r = await apiPut('/api/v1/settings/profil', {
      nama: String(fd.get('nama') ?? ''),
      alamat: String(fd.get('alamat') ?? ''),
      telepon: String(fd.get('telepon') ?? ''),
      email: String(fd.get('email') ?? ''),
    });
    setBusy(false);
    toast(r.ok ? 'Profil perusahaan tersimpan.' : r.error ?? 'Gagal menyimpan.', r.ok ? 'ok' : 'err');
    if (r.ok) window.location.reload();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nama Perusahaan *">
        <Input name="nama" defaultValue={initial.nama} required maxLength={120} placeholder="cth: PT Swarna Dwipa Property" />
      </Field>
      <Field label="Alamat">
        <Textarea name="alamat" defaultValue={initial.alamat} rows={3} maxLength={500} placeholder="Alamat lengkap perusahaan" />
      </Field>
      <Field label="Telepon">
        <Input name="telepon" defaultValue={initial.telepon} maxLength={30} placeholder="cth: 0401-123456" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={initial.email} maxLength={120} placeholder="cth: info@perusahaan.id" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
      </div>
    </form>
  );
}
