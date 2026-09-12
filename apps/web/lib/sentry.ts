// Sentry. The DSN env var already exists in .env.example; this module
// initializes the SDK lazily. When the package is not installed OR no
// DSN is set, every call is a no-op.

import type { EventHint, Exception } from '@sentry/nextjs';

let sentryInitialized = false;
let sentryClient:
  | {
      captureException: (e: Exception, hint?: EventHint) => void;
      captureMessage: (m: string) => void;
    }
  | null = null;

async function ensureClient() {
  if (sentryInitialized) return sentryClient;
  sentryInitialized = true;
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    const mod = await import('@sentry/nextjs');
    mod.init({
      dsn,
      tracesSampleRate: 0.1,
      // Only send PII we actually use. Don't capture request bodies or
      // cookies by default.
      sendDefaultPii: false,
    });
    sentryClient = {
      captureException: (e, h) => mod.captureException(e, h),
      captureMessage: (m) => mod.captureMessage(m),
    };
  } catch {
    sentryClient = null;
  }
  return sentryClient;
}

export async function reportException(error: unknown, hint?: EventHint): Promise<void> {
  const client = await ensureClient();
  if (!client) return;
  try {
    client.captureException(error as Exception, hint);
  } catch {
    // never break the request
  }
}

export async function reportMessage(message: string): Promise<void> {
  const client = await ensureClient();
  if (!client) return;
  try {
    client.captureMessage(message);
  } catch {
    // ignore
  }
}
