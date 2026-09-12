// Simple in-memory rate limiter. Two layers, applied together:
//   1) per-user (by session userId), so a single signed-in user can't spam
//      even from rotating IPs
//   2) per-IP (by client IP), so an unauthenticated flood from one network
//      is also stopped
//
// This is the dev-friendly version. In production, swap the storage layer
// for Upstash Redis so the counter is shared across Node workers and
// survives restarts. The interface here is the same, so the swap is a
// one-file change.

import { NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function gc(now: number) {
  // Periodically drop expired buckets so the Map doesn't grow forever.
  for (const [k, b] of store) {
    if (b.resetAt <= now) store.delete(k);
  }
}

function key(scope: string, who: string) {
  return `${scope}::${who}`;
}

export type RateLimitOpts = {
  /** Bucket scope, e.g. 'messages.send' or 'otp.send'. */
  scope: string;
  /** Max hits per window. */
  limit: number;
  /** Window in milliseconds. */
  windowMs: number;
};

export type RateVerdict =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSec: number; resetAt: number };

export function checkRate(opts: RateLimitOpts, who: string, now = Date.now()): RateVerdict {
  gc(now);
  const k = key(opts.scope, who);
  const existing = store.get(k);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    store.set(k, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt };
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)), resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}

export function getClientIp(req: Request): string {
  // Request.headers in real Next.js is a Headers instance with .get().
  // The QA harness sometimes passes a Map for ergonomics, and some tests
  // pass a plain object with no headers at all. Handle all three.
  const headers = req?.headers as
    | { get(name: string): string | null }
    | Map<string, string>
    | Record<string, string | undefined>
    | undefined;
  if (!headers) return '0.0.0.0';
  const get = (name: string): string | null => {
    if (typeof (headers as { get?: unknown }).get === 'function') {
      return (headers as { get(name: string): string | null }).get(name);
    }
    if (typeof (headers as Map<string, string>).get === 'function' && headers instanceof Map) {
      return headers.get(name) ?? null;
    }
    const m = headers as Record<string, string | undefined>;
    return m[name] ?? m[name.toLowerCase()] ?? null;
  };
  const xff = get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return get('x-real-ip') ?? '0.0.0.0';
}

/**
 * Convenience: returns a 429 NextResponse if the caller is over the limit
 * for both the user and IP buckets. Use this at the top of any mutating
 * route to enforce rate limits without repeating the boilerplate.
 *
 * If `userId` is null (unauthenticated request), only the IP bucket is
 * checked. If `userId` is set, both buckets are checked — a request must
 * pass both to succeed.
 */
export function enforceRate(
  req: Request,
  opts: RateLimitOpts,
  userId: string | null,
): { ok: true } | { ok: false; response: NextResponse } {
  const ip = getClientIp(req);
  const ipVerdict = checkRate(opts, `ip:${ip}`);
  if (!ipVerdict.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(ipVerdict.retryAfterSec) } },
      ),
    };
  }
  if (userId) {
    const userVerdict = checkRate(opts, `user:${userId}`);
    if (!userVerdict.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Too many requests. Try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(userVerdict.retryAfterSec) } },
        ),
      };
    }
  }
  return { ok: true };
}

/** Test-only: clear all in-memory buckets. */
export function _resetRateLimits() {
  store.clear();
}
