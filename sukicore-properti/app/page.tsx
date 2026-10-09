import { redirect } from 'next/navigation';

// Root tidak punya landing page — proxy.ts juga mengarahkan ke login.
// Ini fallback bila proxy dilewati.
export default function Home() {
  redirect('/login');
}
