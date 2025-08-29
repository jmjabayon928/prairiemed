import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth/constants';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Match admin paths only
  if (pathname.startsWith('/admin')) {
    const session = req.cookies.get(AUTH_COOKIE)?.value;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/signin';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'], // adjust if your URLs are different
};
