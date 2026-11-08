import { cookies } from 'next/headers';
import type { User } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Server-side session check: asks the API who the cookie belongs to. */
export async function getSessionUser(): Promise<User | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, { headers: { cookie: cookieHeader }, cache: 'no-store' });
    return res.ok ? ((await res.json()) as User) : null;
  } catch {
    return null;
  }
}
