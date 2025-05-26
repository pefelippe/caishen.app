import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const isAuthPage = request.nextUrl.pathname === '/login';
  const isAppPage = request.nextUrl.pathname.startsWith('/app');

  // If user is not authenticated and tries to access app pages
  if (isAppPage && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is authenticated and tries to access login page
  if (isAuthPage && authCookie) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login'],
}; 