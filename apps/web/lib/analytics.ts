// Analytics. The event names here come from the developer review:
// signup_started, role_selected, onboarding_step_completed, social_connected,
// profile_published, search_performed, creator_profile_viewed, invite_sent,
// application_submitted, application_status_changed, contract_created,
// contract_signed, escrow_funded, work_submitted, milestone_approved,
// payment_released, review_left, dispute_opened.
//
// PostHog is wired lazily. If the package is not installed OR the env var
// is missing, every call is a no-op so the dev experience is unaffected.

import { headers } from 'next/headers';

type AnalyticsEvent =
  | 'signup_started'
  | 'role_selected'
  | 'onboarding_step_completed'
  | 'social_connected'
  | 'profile_published'
  | 'search_performed'
  | 'creator_profile_viewed'
  | 'invite_sent'
  | 'application_submitted'
  | 'application_status_changed'
  | 'contract_created'
  | 'contract_signed'
  | 'escrow_funded'
  | 'work_submitted'
  | 'milestone_approved'
  | 'payment_released'
  | 'review_left'
  | 'dispute_opened';

type EventProps = Record<string, string | number | boolean | null | undefined>;

let posthogClient: { capture: (args: { distinctId: string; event: string; properties?: EventProps }) => void } | null = null;
let initTried = false;

async function ensureClient() {
  if (initTried) return posthogClient;
  initTried = true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  if (!key) return null;
  try {
    const mod = await import('posthog-node');
    posthogClient = new mod.PostHog(key, { host, flushAt: 1, flushInterval: 1000 });
  } catch {
    // Package not installed. Dev mode: silent no-op.
    posthogClient = null;
  }
  return posthogClient;
}

export async function trackServerEvent(
  distinctId: string,
  event: AnalyticsEvent,
  properties?: EventProps,
): Promise<void> {
  if (!distinctId) return;
  const client = await ensureClient();
  if (!client) return;
  try {
    client.capture({ distinctId, event, properties });
  } catch {
    // Never let analytics break a request.
  }
}

/** Sync helper for places where we don't want to await (e.g. inside a
 * transaction that has to commit quickly). Fire-and-forget; the client
 * batches and flushes. */
export function trackServerEventFireAndForget(
  distinctId: string,
  event: AnalyticsEvent,
  properties?: EventProps,
): void {
  if (!distinctId) return;
  void trackServerEvent(distinctId, event, properties);
}

export async function identifyServerUser(
  distinctId: string,
  traits: Record<string, string | number | boolean | null | undefined>,
): Promise<void> {
  if (!distinctId) return;
  const client = await ensureClient();
  if (!client) return;
  try {
    // posthog-node exposes identify at runtime; cast to any to keep the
    // type narrow at the call site.
    (client as unknown as { identify: (args: { distinctId: string; properties: typeof traits }) => void }).identify({
      distinctId,
      properties: traits,
    });
  } catch {
    // ignore
  }
}

/** Convenience: distinctId is the current user id, or a generated anon id
 * if the request is unauthenticated. */
export async function getRequestDistinctId(userId: string | null | undefined): Promise<string> {
  if (userId) return userId;
  try {
    const h = await headers();
    return h.get('x-forwarded-for') || 'anon';
  } catch {
    return 'anon';
  }
}

export type { AnalyticsEvent };
