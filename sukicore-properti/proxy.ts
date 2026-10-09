import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16: pengganti middleware.ts (deprecated).
 * Penjagaan ringan berbasis keberadaan cookie session.
 * Validasi session yang sebenarnya tetap dilakukan di
 * Server Components / Route Handlers via getSessionUser().
 *
 * Catatan: halaman login ada di /login (di luar /admin) agar tidak
 * terbungkus layout admin yang mewajibkan session.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('sukicore_session');

  // /admin/login lama → /login
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Area admin wajib login
  if (pathname.startsWith('/admin')) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      url.searchParams.set('denied', '1');
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Halaman login: yang sudah login diarahkan ke beranda
  if (pathname === '/login' && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/beranda';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Root → login (tidak ada landing page publik)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*'],
};
