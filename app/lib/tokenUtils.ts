import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || '7f8d9a3b2c1e5f6a8b7c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6'
);

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      username: payload.username as string,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function getTokenFromUrl(): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }
  return null;
}

export function removeTokenFromUrl(): void {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());
  }
}

export function createAuthUrl(path: string, token: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('token', token);
  return url.toString();
}
