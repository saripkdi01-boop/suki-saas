'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { loginAction } from './actions';
import { Button, Input, Field } from '@/components/ui';

function LoginForm() {
  const sp = useSearchParams();
  const next = sp.get('next') ?? '/admin/beranda';
  const denied = sp.get('denied');
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Building2 size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">SUKICORE Properti</h1>
          <p className="mt-1 text-sm text-slate-500">ERP Internal Developer Perumahan</p>
        </div>

        {denied && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Sesi berakhir atau tidak valid. Silakan login kembali.
          </div>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Username">
            <Input name="username" autoComplete="username" placeholder="master" required autoFocus />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
          </Field>
          {state?.error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {state.error}
            </div>
          )}
          <Button type="submit" disabled={pending} className="w-full py-2.5">
            {pending ? 'Memeriksa…' : 'Masuk'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Akses internal. Seluruh aktivitas tercatat di log.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
