import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const isAuthPage = request.nextUrl.pathname === '/login';
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard') || 
                          request.nextUrl.pathname.startsWith('/expenses') ||
                          request.nextUrl.pathname.startsWith('/bills') ||
                          request.nextUrl.pathname.startsWith('/analytics') ||
                          request.nextUrl.pathname.startsWith('/goals') ||
                          request.nextUrl.pathname.startsWith('/income') ||
                          request.nextUrl.pathname.startsWith('/salary') ||
                          request.nextUrl.pathname.startsWith('/profile') ||
                          request.nextUrl.pathname.startsWith('/settings') ||
                          request.nextUrl.pathname.startsWith('/billing');

  if (isDashboardPage && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && authCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/expenses/:path*', '/bills/:path*', '/analytics/:path*', '/goals/:path*', '/income/:path*', '/salary/:path*', '/profile/:path*', '/settings/:path*', '/billing/:path*', '/login'],
}; 