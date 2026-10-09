'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Field, Input, Button, toast } from '@/components/ui';

export default function GantiPasswordPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const oldPassword = String(fd.get('oldPassword') ?? '');
    const newPassword = String(fd.get('newPassword') ?? '');
    const confirm = String(fd.get('confirm') ?? '');
    if (newPassword !== confirm) {
      toast('Konfirmasi password tidak sama.', 'err');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error?.message ?? 'Gagal mengganti password.', 'err');
      return;
    }
    toast('Password berhasil diganti.');
    router.push('/admin/beranda');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Ganti Password" subtitle="Minimal 8 karakter. Jangan bagikan ke siapa pun." />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Password lama">
            <Input name="oldPassword" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="Password baru">
            <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Konfirmasi password baru">
            <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Menyimpan…' : 'Simpan Password Baru'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
