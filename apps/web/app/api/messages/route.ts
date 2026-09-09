import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const schema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

/**
 * Send a message in a thread. A thread can be either:
 *  - a Contract ID  (the deal has been accepted — post-agreement messaging)
 *  - an Application ID  (a brand-initiated invite or a creator's application —
 *    lets the two sides talk before accepting)
 *
 * We look up the contract first, then fall back to the application. The
 * threadId is opaque from the client's perspective.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Write a message of 1\u20132,000 characters.' },
      { status: 400 },
    );
  }
  const { threadId, body } = parsed.data;

  // Try the contract first.
  let allowed: { creatorId: string; brandId: string } | null =
    await db.contract.findUnique({
      where: { id: threadId },
      select: { creatorId: true, brandId: true },
    });

  // Fall back to an application (invite or open proposal).
  if (!allowed) {
    const application = await db.application.findUnique({
      where: { id: threadId },
      include: { campaign: { select: { brandId: true } } },
    });
    if (application) {
      allowed = {
        creatorId: application.creatorId,
        brandId: application.campaign.brandId,
      };
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (allowed.creatorId !== session.user.id && allowed.brandId !== session.user.id) {
    return NextResponse.json(
      { error: 'You are not a participant in this conversation' },
      { status: 403 },
    );
  }

  const message = await db.message.create({
    data: { threadId, senderId: session.user.id, body },
  });
  return NextResponse.json({ ok: true, id: message.id, createdAt: message.createdAt });
}
