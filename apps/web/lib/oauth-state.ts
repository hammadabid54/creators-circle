import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import type { Provider } from './social-providers';

const COOKIE_NAME = 'anj_oauth_state';
const TTL_SECONDS = 10 * 60; // 10 minutes

interface StatePayload {
  provider: Provider;
  state: string;
  /** Where to redirect after the callback finishes. */
  returnTo: string;
  /** Mock mode: skip the provider roundtrip and just create a fake account. */
  mock: boolean;
  expiresAt: number;
}

/**
 * Issue a CSRF state token, store its metadata in an httpOnly cookie, and
 * return the state string to embed in the provider's authorize URL.
 */
export async function issueState(
  provider: Provider,
  returnTo: string,
  mock: boolean,
): Promise<string> {
  const state = randomBytes(24).toString('base64url');
  const payload: StatePayload = { provider, state, returnTo, mock, expiresAt: Date.now() + TTL_SECONDS * 1000 };

  const jar = await cookies();
  // Each attempt gets its own cookie so another tab/provider cannot overwrite it.
  jar.set(`${COOKIE_NAME}_${state}`, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_SECONDS,
  });

  return state;
}

/** Read the state payload, validate the token, and clear the cookie. */
export async function consumeState(
  returnedState: string,
): Promise<StatePayload | null> {
  const jar = await cookies();
  if (!/^[A-Za-z0-9_-]{32}$/.test(returnedState)) return null;
  const name = `${COOKIE_NAME}_${returnedState}`;
  const raw = jar.get(name)?.value;
  if (!raw) return null;
  // Always clear the cookie — single use.
  jar.delete(name);

  let payload: StatePayload;
  try {
    payload = JSON.parse(raw) as StatePayload;
  } catch {
    return null;
  }
  if (!payload || payload.state !== returnedState ||
      !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
  return payload;
}
