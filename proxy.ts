import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE_NAME = 'session_token';

// Paths that require authentication
const protectedPaths = ['/dashboard', '/appointments', '/pets', '/medical-records', '/vet'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Simple existence check for path-routing protection at the routing edge
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !token) {
    const loginUrl = new URL('/', request.url); // Redirect to home/login page
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Intercept only static routes we want to protect
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/appointments/:path*',
    '/pets/:path*',
    '/medical-records/:path*',
    '/vet/:path*',
  ],
};
