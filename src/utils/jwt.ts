/**
 * JWT utility for decoding token payload (client-side only).
 * Does NOT verify the signature - the backend verifies on each API request.
 * Use this solely to derive user info for UI/routing from the trusted token.
 */

export interface TokenPayload {
  user_id: string;
  employee_id: string;
  role: string;
  org_id: string | null;
  staff_id: string | null;
  /** Present when included in token (WARD_INCHARGE, etc.) */
  ward_id?: string[] | null;
  /** Display name from staff record */
  name?: string | null;
  exp?: number;
  iat?: number;
  type?: string;
}

/**
 * Decode JWT payload without verification.
 * Backend verifies the token on each API request.
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired (client-side check only).
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
