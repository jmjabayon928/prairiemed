// src/lib/auth/fetchWithAuth.ts
let accessToken: string | null = null;
export function setAccessToken(tok: string | null) { accessToken = tok; }

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const doFetch = async () =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

  // First try
  let res = await doFetch();

  // If unauthorized, try to refresh once
  if (res.status === 401) {
    try {
      const rr = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (rr.ok) {
        const { accessToken: newTok } = await rr.json();
        setAccessToken(newTok);
        res = await doFetch(); // retry once
      }
    } catch {
      // ignore; will return the original 401
    }
  }
  return res;
}
