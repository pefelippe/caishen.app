import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const isAuthPage = request.nextUrl.pathname === '/login';
  const isProtectedPage = request.nextUrl.pathname.startsWith('/dashboard') || 
                          request.nextUrl.pathname.startsWith('/app');

  if (isProtectedPage && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && authCookie) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/app/:path*', '/login'],
}; 