// POST /api/applications/invite
// A brand sends an invite to a creator for one of the brand's open
// campaigns. Creates an Application row with status='invited' so the
// creator sees it in /creator/applications under "Invitations" and can
// accept (proposes a rate, status -> pending) or decline (status ->
// withdrawn). The inbox thread also opens for messaging.
//
// This is the highest-leverage unbuilt flow in the existing model: brand
// intent is the scarce resource on a two-sided marketplace, and the
// `invited` status was already in the enum with no UI behind it.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforceRate } from '@/lib/rate-limit';
import { trackServerEventFireAndForget } from '@/lib/analytics';
import { emitNotification } from '@/lib/notifications';
import { recordAudit } from '@/lib/audit';

const schema = z.object({
  campaignId: z.string().min(1),
  creatorId: z.string().min(1),
  // Optional opening message that becomes the first message in the
  // thread. Capped at the same 2000 chars as POST /api/messages.
  message: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.user.role !== 'brand') {
    return NextResponse.json({ error: 'Not a brand account' }, { status: 403 });
  }
  // 30 invites per brand per hour. Generous; the (campaignId, creatorId)
  // unique constraint already stops duplicates on the same pair.
  const rateCheck = enforceRate(
    req,
    { scope: 'invites.send', limit: 30, windowMs: 60 * 60 * 1000 },
    session.user.id,
  );
  if (!rateCheck.ok) return rateCheck.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Pick a campaign and a creator to invite.' },
      { status: 400 },
    );
  }
  const { campaignId, creatorId, message } = parsed.data;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, brandId: true, status: true, title: true },
  });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.brandId !== session.user.id) {
    return NextResponse.json({ error: 'You do not own this campaign.' }, { status: 403 });
  }
  if (campaign.status !== 'open') {
    return NextResponse.json(
      { error: 'This campaign is not accepting new invites.' },
      { status: 409 },
    );
  }

  const creator = await db.creatorProfile.findUnique({
    where: { userId: creatorId },
    select: { userId: true, slug: true },
  });
  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Create the invited application. proposedRate is 0 (placeholder) and
  // pitch is a system message that the creator replaces when they accept.
  // Use upsert-style logic by catching the unique-constraint race: if a
  // pending/shortlisted/accepted application already exists, we surface
  // 409 with a useful message; if an existing `invited` or `withdrawn`
  // application exists, we reset it to `invited`.
  const existing = await db.application.findUnique({
    where: { campaignId_creatorId: { campaignId, creatorId } },
  });
  let applicationId: string;
  if (existing) {
    if (existing.status === 'pending' || existing.status === 'shortlisted' || existing.status === 'accepted') {
      return NextResponse.json(
        { error: 'You already have an open proposal with this creator on this campaign.' },
        { status: 409 },
      );
    }
    // Resurrect the existing row: re-invite.
    const updated = await db.application.update({
      where: { id: existing.id },
      data: {
        status: 'invited',
        pitch:
          message ||
          'You have been invited to discuss this campaign with the brand. ' +
            'Send a message to begin, or accept the invite to start work.',
        proposedRate: 0,
      },
    });
    applicationId = updated.id;
  } else {
    const created = await db.application.create({
      data: {
        campaignId,
        creatorId,
        proposedRate: 0,
        pitch:
          message ||
          'You have been invited to discuss this campaign with the brand. ' +
            'Send a message to begin, or accept the invite to start work.',
        status: 'invited',
      },
    });
    applicationId = created.id;
  }

  // Optional opening message — written as a Message on the application
  // thread so it lands in the creator's inbox immediately.
  if (message) {
    await db.message.create({
      data: {
        threadId: applicationId,
        senderId: session.user.id,
        body: message,
      },
    });
  }

  trackServerEventFireAndForget(session.user.id, 'invite_sent', {
    campaignId,
    creatorId,
    campaignTitle: campaign.title,
  });
  trackServerEventFireAndForget(creatorId, 'invite_sent', {
    campaignId,
    campaignTitle: campaign.title,
  });

  // Notify the creator. The notification is written after the API call
  // returns so a failure here doesn't roll back the invite.
  await db.$transaction(async (tx) => {
    await emitNotification(tx, {
      userId: creatorId,
      type: 'application.invited',
      title: `You've been invited to ${campaign.title}`,
      body: message || 'A brand has invited you to discuss a campaign.',
      payload: { campaignId, applicationId },
    });
    await recordAudit(
      {
        actorType: 'user',
        actorId: session.user.id,
        action: 'invite.sent',
        entityType: 'Application',
        entityId: applicationId,
        after: { campaignId, creatorId, status: 'invited' },
      },
      tx,
    );
  });

  return NextResponse.json({ ok: true, applicationId });
}
