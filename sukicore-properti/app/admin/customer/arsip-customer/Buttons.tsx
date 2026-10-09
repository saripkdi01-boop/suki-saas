'use client';

import { useState } from 'react';
import { Button, toast } from '@/components/ui';

export function RestoreButton({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);

  const click = async () => {
    if (!window.confirm('Kembalikan customer ini dari arsip?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/customers/${id}/restore`, { method: 'PUT' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        toast(json?.error?.message ?? 'Gagal mengembalikan customer.', 'err');
        return;
      }
      toast('Customer dikembalikan dari arsip.');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="success" disabled={busy} onClick={click}>
      {busy ? '…' : 'Kembalikan'}
    </Button>
  );
}
