// POST /api/notifications/drain
// Runs the in-process delivery worker once. In production this would be
// a Vercel cron or a queue worker; in dev you can hit it manually or
// the workspace page does it on load.

import { NextResponse } from 'next/server';
import { drainDeliveries } from '@/lib/notifications';

export async function POST() {
  const result = await drainDeliveries({ take: 100 });
  return NextResponse.json(result);
}
