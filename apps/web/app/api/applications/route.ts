import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { enforceRate } from '@/lib/rate-limit';

const schema = z.object({
  campaignId: z.string().min(1),
  proposedRate: z.number().int().min(0),
  timeline: z.string().max(200).optional(),
  pitch: z.string().min(20).max(2000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.user.role !== 'creator') {
    return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
  }
  // 30 applications per hour per creator is generous. The duplicate
  // (campaignId, creatorId) constraint already stops repeat applications
  // to the same campaign; this stops repeat applications to *different*
  // campaigns from a single account.
  const rateCheck = enforceRate(
    req,
    { scope: 'applications.create', limit: 30, windowMs: 60 * 60 * 1000 },
    session.user.id,
  );
  if (!rateCheck.ok) return rateCheck.response;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check campaign exists and is open
  const campaign = await db.campaign.findUnique({
    where: { id: parsed.data.campaignId },
  });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  if (campaign.status !== 'open') {
    return NextResponse.json({ error: 'Campaign is not accepting applications' }, { status: 400 });
  }
  if (campaign.brandId === session.user.id) {
    return NextResponse.json({ error: 'You cannot apply to your own campaign' }, { status: 400 });
  }

  try {
    const application = await db.application.create({
      data: {
        campaignId: parsed.data.campaignId,
        creatorId: session.user.id,
        proposedRate: parsed.data.proposedRate,
        timeline: parsed.data.timeline ?? null,
        pitch: parsed.data.pitch,
        status: 'pending',
      },
    });
    return NextResponse.json({ ok: true, id: application.id });
  } catch (err) {
    // Unique constraint on (campaignId, creatorId) — already applied
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 },
      );
    }
    throw err;
  }
}
