import { NextRequest } from 'next/server';

/**
 * Resolves the application base URL based on incoming request headers
 * (x-forwarded-host, host), detects dev/localhost vs production HTTPS,
 * and falls back to configured environment variables.
 *
 * Trailing slashes are stripped.
 */
export function resolveBaseUrl(req?: Request | NextRequest | null): string {
  let host: string | null = null;
  let protocol: string | null = null;

  if (req && req.headers) {
    // Check x-forwarded-proto first if present
    const forwardedProto = req.headers.get('x-forwarded-proto');
    if (forwardedProto) {
      protocol = forwardedProto.split(',')[0].trim();
    }

    // Check host headers
    const forwardedHost = req.headers.get('x-forwarded-host');
    const rawHost = req.headers.get('host');
    host = (forwardedHost ? forwardedHost.split(',')[0].trim() : rawHost) || null;
  }

  if (host) {
    if (!protocol) {
      const isLocal =
        host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        host.includes('::1') ||
        host.includes(':3000') ||
        host.startsWith('192.168.') ||
        host.startsWith('10.');
      protocol = isLocal ? 'http' : 'https';
    }
    return `${protocol}://${host}`.replace(/\/+$/, '');
  }

  // Fallback to environment variables
  const envUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  return envUrl.replace(/\/+$/, '');
}
