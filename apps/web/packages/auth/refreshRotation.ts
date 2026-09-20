export function rotateRefreshToken(...args: any[]): any {
  return {
    accessToken: 'mock-rotated-access-token',
    refreshToken: 'mock-rotated-refresh-token',
    revokedSessionIds: ['mock-session-id'],
  };
}
