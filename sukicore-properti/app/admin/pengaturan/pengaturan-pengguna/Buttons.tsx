'use client';

import { useState } from 'react';
import { AutoForm, type AutoField } from '@/components/AutoForm';
import { DeleteButton, Button, Modal, Field, Input, toast } from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/client-api';

interface RoleOpt {
  value: string;
  label: string;
}

interface UserRow {
  id: number;
  username: string;
  nama_lengkap: string;
  role_id: number;
  is_active: boolean;
}

export function UserCreateButton({ roleOptions }: { roleOptions: RoleOpt[] }) {
  const fields: AutoField[] = [
    { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'huruf kecil, tanpa spasi' },
    { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { name: 'role_id', label: 'Role', type: 'select', required: true, options: roleOptions },
    { name: 'password', label: 'Password (min. 8 karakter)', type: 'text', required: true, placeholder: 'min. 8 karakter' },
    { name: 'is_active', label: 'Aktif', type: 'checkbox' },
  ];
  return (
    <AutoForm
      title="Tambah Pengguna"
      fields={fields}
      initial={{ is_active: true }}
      triggerLabel="Tambah Pengguna"
      onSubmit={(v) => apiPost('/api/v1/settings/users', v)}
    />
  );
}

export function UserEditButton({ row, roleOptions }: { row: UserRow; roleOptions: RoleOpt[] }) {
  const fields: AutoField[] = [
    { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { name: 'role_id', label: 'Role', type: 'select', required: true, options: roleOptions },
    { name: 'is_active', label: 'Aktif', type: 'checkbox' },
  ];
  return (
    <AutoForm
      title={`Edit Pengguna — ${row.username}`}
      fields={fields}
      initial={{ nama_lengkap: row.nama_lengkap, role_id: String(row.role_id), is_active: row.is_active }}
      trigger={<Button variant="secondary">Edit</Button>}
      onSubmit={(v) => apiPut(`/api/v1/settings/users/${row.id}`, v)}
    />
  );
}

export function UserResetPasswordButton({ id, username }: { id: number; username: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const r = await apiPost(`/api/v1/settings/users/${id}/reset-password`, { password: pw });
    setBusy(false);
    toast(r.ok ? 'Password berhasil direset.' : r.error ?? 'Gagal mereset password.', r.ok ? 'ok' : 'err');
    if (r.ok) {
      setOpen(false);
      window.location.reload();
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Reset Password
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Reset Password — ${username}`}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Password Baru (min. 8 karakter) *">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
          </Field>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pengguna akan diminta mengganti password saat login berikutnya.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Reset'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function UserDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/settings/users/${id}`)} />;
}
