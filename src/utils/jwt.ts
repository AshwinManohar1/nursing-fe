export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload?.exp) return true
  return (payload.exp as number) * 1000 < Date.now()
}
