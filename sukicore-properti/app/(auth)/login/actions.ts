'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginUser } from '@/lib/auth';

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin/beranda');

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const res = await loginUser(username, password, ip);
  if (!res.ok) return { error: res.error };
  redirect(next.startsWith('/admin') ? next : '/admin/beranda');
}
