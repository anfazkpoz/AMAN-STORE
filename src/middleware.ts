import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Read session cookie
  const sessionCookie = request.cookies.get('aman_store_session')?.value;
  let hasValidSession = false;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      if (parsed && parsed.id && parsed.role) {
        hasValidSession = true;
      }
    } catch {
      hasValidSession = false;
    }
  }

  // 2. Define routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profile');

  const isLoginRoute = pathname === '/login';

  // Direct alias for /admin -> /dashboard or /login
  if (pathname === '/admin' || pathname === '/admin/') {
    if (hasValidSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protected route without valid session -> redirect to /login
  if (isProtectedRoute && !hasValidSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Accessing /login with valid session -> redirect to /dashboard
  if (isLoginRoute && hasValidSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, sw.js, icons (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
};
