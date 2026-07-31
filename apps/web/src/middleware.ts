import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  // Presence check only — the backend validates the session on every request.
  const session = getSessionCookie(request);
  const isAuthPage = request.nextUrl.pathname === '/login';
  const isProtectedPage =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/app');

  if (isProtectedPage && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/app/:path*', '/login'],
};
