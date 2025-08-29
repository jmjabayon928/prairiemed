// src/lib/auth/authClient.ts
/**
 * Client-side auth helpers:
 * - Keeps an in-memory accessToken (not persisted)
 * - Proxies all calls through Next.js (`/api/...`) so there's no CORS in dev
 * - Automatically refreshes once on 401 and retries the request
 */

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  locale?: string;
  // add any other profile fields your API returns
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

// ---------- In-memory access token ----------
let accessToken: string | null = null;

/** Keep the access token in memory for Authorization headers */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

// ---------- Small utils ----------
async function getErrorMessage(res: Response) {
  try {
    const text = await res.text();
    return text || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

// ---------- Public API helpers ----------
export async function login(
  email: string,
  password: string,
  remember?: boolean
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // so refresh cookie is set/sent
    body: JSON.stringify({ email, password, remember: !!remember }),
  });

  if (!res.ok) throw new Error(await getErrorMessage(res));

  const data = (await res.json()) as LoginResponse;
  // store access token in memory so subsequent calls send Authorization
  setAccessToken(data.accessToken);
  return data;
}

/** Call once to rotate refresh cookie and get a new access token */
export async function refresh(): Promise<{ accessToken: string }> {
  const r = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(await getErrorMessage(r));
  const body = (await r.json()) as { accessToken: string };
  setAccessToken(body.accessToken);
  return body;
}

/** Fetch current user using the auth-aware fetch (auto refresh on 401) */
export async function me(): Promise<AuthUser> {
  const res = await fetchWithAuth('/api/auth/me', { method: 'GET' });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  const data = await res.json();
  return data.user as AuthUser;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  setAccessToken(null);
}

// ---------- Auth-aware fetch with single refresh retry ----------
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const build = () =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        // only set content-type if not already set and body is JSON
        ...(!('Content-Type' in (init.headers || {})) &&
        (init.body && typeof init.body === 'string')
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      credentials: 'include',
    });

  // First attempt
  let res = await build();

  // If unauthorized, try a single refresh then retry once
  if (res.status === 401) {
    try {
      const rr = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (rr.ok) {
        const { accessToken: newToken } = (await rr.json()) as {
          accessToken: string;
        };
        setAccessToken(newToken);
        res = await build(); // retry once with fresh token
      }
    } catch {
      // ignore; we'll return the 401 result
    }
  }

  return res;
}
