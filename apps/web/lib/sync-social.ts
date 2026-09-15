/**
 * Shared helpers for provider-driven social sync.
 *
 * The platform-specific files (youtube-metrics, meta-metrics, tiktok-metrics)
 * call into this module to:
 *  - decide whether a sync is worth attempting (throttle / lastSyncedAt gate)
 *  - refresh an expired OAuth access token before making API calls
 *  - classify HTTP failures so callers can surface useful error messages
 *
 * Keeping this logic in one place ensures all three providers behave the same
 * under "throttle me" / "token expired" / "provider returned garbage" conditions.
 */

import { db } from '@/lib/db';
import { z } from 'zod';

export const MIN_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
export const FETCH_TIMEOUT_MS = 10_000;

export type SyncErrorKind =
  | 'rate_limited'
  | 'expired'
  | 'rejected'
  | 'malformed'
  | 'unknown';

export interface SyncFailure extends Error {
  kind: SyncErrorKind;
  retryAfterSec?: number;
}

/**
 * Returns true if the account was synced recently enough to skip. We never
 * want a creator hitting "Sync now" to hammer a provider's rate limit — and
 * we never want a scheduled cron to make thousands of identical calls per
 * hour. 1 hour is a sensible floor across all three platforms.
 */
export function shouldThrottle(
  lastSyncedAt: Date | null,
  now: number = Date.now(),
  minIntervalMs: number = MIN_SYNC_INTERVAL_MS,
): boolean {
  if (!lastSyncedAt) return false;
  return now - lastSyncedAt.getTime() < minIntervalMs;
}

/**
 * Wraps a fetch call with an abort timeout. Most platform APIs return within
 * a few hundred ms; a 10s ceiling lets us fail fast on stalled connections
 * without giving up on slow-but-valid responses.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Translate a fetch failure into a structured SyncFailure so callers can
 * decide whether to surface "rate limited, try later" vs "your account is
 * disconnected, please reconnect".
 */
export function classifyFetchError(status: number, retryAfterHeader: string | null): SyncFailure {
  const err = new Error() as SyncFailure;
  err.kind = 'unknown';
  if (status === 429 || status === 403) {
    err.kind = 'rate_limited';
    if (retryAfterHeader) {
      const seconds = Number(retryAfterHeader);
      if (Number.isFinite(seconds) && seconds > 0) err.retryAfterSec = seconds;
    }
    err.message = 'Provider is rate limiting requests. Try again shortly.';
  } else if (status === 401) {
    err.kind = 'expired';
    err.message = 'Authorization has expired. Reconnect your account.';
  } else if (status >= 500) {
    err.kind = 'rejected';
    err.message = 'Provider is having trouble right now. Try again later.';
  } else {
    err.message = `Provider returned status ${status}.`;
  }
  return err;
}

/**
 * Run an OAuth refresh flow and persist the new token + expiry. Returns the
 * fresh access token. Throws a SyncFailure with kind='expired' if credentials
 * are missing, kind='rejected' if the provider refuses.
 *
 * Each provider has a slightly different refresh body shape, so the caller
 * supplies the URL + params + response schema.
 */
export async function refreshAccessToken(args: {
  socialAccountId: string;
  tokenUrl: string;
  refreshToken: string;
  /** Field name to use for grant_type (defaults to 'refresh_token') */
  grantType?: string;
  /** Additional params merged into the request body (e.g. client credentials) */
  extraBody?: Record<string, string>;
  /** Zod schema describing the provider's refresh response */
  schema: z.ZodType<{ access_token: string; expires_in: number; refresh_token?: string }>;
}): Promise<string> {
  const body = new URLSearchParams({
    grant_type: args.grantType ?? 'refresh_token',
    refresh_token: args.refreshToken,
    ...(args.extraBody ?? {}),
  });
  const res = await fetchWithTimeout(args.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw classifyFetchError(res.status, res.headers.get('retry-after'));
  }
  const parsed = args.schema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    const err = new Error('Provider returned a malformed token response.') as SyncFailure;
    err.kind = 'malformed';
    throw err;
  }
  await db.socialAccount.update({
    where: { id: args.socialAccountId },
    data: {
      accessToken: parsed.data.access_token,
      tokenExpiresAt: new Date(Date.now() + parsed.data.expires_in * 1000),
      ...(parsed.data.refresh_token ? { refreshToken: parsed.data.refresh_token } : {}),
    },
  });
  return parsed.data.access_token;
}

/**
 * Look up an account, return a valid (non-expired) access token. Refreshes
 * if expiry is within the next 60 seconds. Throws if the account isn't
 * connected or refresh credentials are missing.
 */
export async function getValidAccessToken(
  socialAccountId: string,
  refresher: (currentToken: string) => Promise<string>,
): Promise<string> {
  const account = await db.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account) {
    const err = new Error('Social account not found.') as SyncFailure;
    err.kind = 'expired';
    throw err;
  }
  if (account.connectionState === 'dev_mock') {
    const err = new Error('Demo accounts cannot be refreshed from the provider.') as SyncFailure;
    err.kind = 'expired';
    throw err;
  }
  if (!account.accessToken) {
    const err = new Error('No access token on file. Reconnect your account.') as SyncFailure;
    err.kind = 'expired';
    throw err;
  }
  const expiresSoon =
    !account.tokenExpiresAt ||
    account.tokenExpiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return account.accessToken;
  if (!account.refreshToken) {
    const err = new Error('Token expired and no refresh token available. Reconnect.') as SyncFailure;
    err.kind = 'expired';
    throw err;
  }
  return refresher(account.refreshToken);
}
