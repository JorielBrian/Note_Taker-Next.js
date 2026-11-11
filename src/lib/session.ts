import { cookies } from 'next/headers';
import type { User } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface SessionCheck {
  user: User | null;
  expired: boolean;
}

/** Server-side session check: the API remains the source of truth. */
export async function checkSession(): Promise<SessionCheck> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return { user: null, expired: false };

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (res.ok) return { user: (await res.json()) as User, expired: false };

    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    return { user: null, expired: res.status === 401 && body?.code === 'SESSION_EXPIRED' };
  } catch {
    return { user: null, expired: false };
  }
}
