import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Mengecek apakah ada cookie sesi yang diset saat login
  const authCookie = request.cookies.get('vooga-session');
  const isLoginPage = request.nextUrl.pathname === '/login';

  // 1. Jika BELUM LOGIN dan mencoba akses halaman selain /login -> Lempar ke /login
  if (!authCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Jika SUDAH LOGIN tapi mencoba akses halaman /login -> Kembalikan ke Dashboard
  if (authCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Lanjutkan request jika aman
  return NextResponse.next();
}

// Konfigurasi jalur mana saja yang akan diawasi oleh Middleware ini
export const config = {
  matcher: [
    /*
     * Awasi semua rute KECUALI yang berawalan:
     * - api (API routes)
     * - _next/static (file statis)
     * - _next/image (file optimasi gambar)
     * - favicon.ico (ikon web)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};