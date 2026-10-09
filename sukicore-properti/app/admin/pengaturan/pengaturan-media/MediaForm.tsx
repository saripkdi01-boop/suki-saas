'use client';

import { useRef, useState } from 'react';
import { Button, toast } from '@/components/ui';
import { cx } from '@/lib/format';

export function MediaForm({
  assetKey,
  currentUrl,
  canEdit,
}: {
  assetKey: string;
  currentUrl: string | null;
  canEdit: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast('Pilih file gambar dulu.', 'err');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Ukuran file maksimal 5 MB.', 'err');
      return;
    }
    const fd = new FormData();
    fd.append('key', assetKey);
    fd.append('file', file);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/settings/media', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json?.error?.message ?? 'Gagal mengunggah.', 'err');
        return;
      }
      setPreview((json.data?.file_url as string) ?? null);
      toast('Media tersimpan.');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {preview ? (
        <img
          src={preview}
          alt={assetKey}
          className="max-h-40 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-600">
          Belum ada gambar
        </div>
      )}
      {canEdit && (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={cx(
              'w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200',
              'file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-300 dark:text-slate-300',
              'dark:file:bg-slate-700 dark:hover:file:bg-slate-600'
            )}
          />
          <Button type="button" onClick={upload} disabled={busy}>
            {busy ? 'Mengunggah…' : 'Unggah'}
          </Button>
        </div>
      )}
    </div>
  );
}
