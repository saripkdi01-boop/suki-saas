'use client';

import { useState } from 'react';
import { Button, toast } from '@/components/ui';

export function ToggleReadyButton({ id, isReady }: { id: number; isReady: boolean }) {
  const [busy, setBusy] = useState(false);

  const click = async () => {
    if (busy) return;
    const ok = window.confirm(
      isReady
        ? 'Nonaktifkan status ready unit ini?'
        : 'Tandai unit ini sebagai ready (siap jual)?'
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/units/${id}/toggle-ready`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json?.error?.message ?? 'Gagal mengubah status ready.', 'err');
        return;
      }
      toast(isReady ? 'Status ready dinonaktifkan.' : 'Unit ditandai ready.');
      window.location.reload();
    } catch {
      toast('Gagal mengubah status ready.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" disabled={busy} onClick={click}>
      {busy ? '…' : isReady ? 'Nonaktifkan Ready' : 'Tandai Ready'}
    </Button>
  );
}
