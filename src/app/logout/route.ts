import {NextResponse} from 'next/server';

/**
 * GET /logout
 * Visiting this URL will:
 *  1) call your Express API's /auth/logout via the Next.js /api proxy
 *  2) let the backend revoke session & clear cookies
 *  3) redirect the user to /signin
 */
export const dynamic = 'force-dynamic'; // ensure no caching

export async function GET(req: Request) {
  // Forward the browser cookies to the backend so it can revoke/clear them
  const cookie = req.headers.get('cookie') ?? '';

  // Build an absolute URL to the API route on this same host
  const apiUrl = new URL('/api/auth/logout', req.url);

  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { cookie },
      cache: 'no-store',
    });
  } catch {
    // Best-effort: even if the API call fails, we'll still redirect away
  }

  // Send them to the sign-in page
  return NextResponse.redirect(new URL('/signin', req.url));
}
