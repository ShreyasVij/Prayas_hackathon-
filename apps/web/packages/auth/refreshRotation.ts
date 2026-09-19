export function rotateRefreshToken(token: string): { accessToken: string; refreshToken: string } {
  return {
    accessToken: 'mock-rotated-access-token',
    refreshToken: 'mock-rotated-refresh-token',
  };
}
