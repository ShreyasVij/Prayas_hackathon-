export function issueAccessToken(payload: any): string {
  return 'mock-access-token';
}

export function issueRefreshToken(payload: any): string {
  return 'mock-refresh-token';
}

export function verifyToken(token: string): { valid: boolean; payload?: any } {
  return { valid: true, payload: { sub: 'mock-user-id', role: 'patient' } };
}
