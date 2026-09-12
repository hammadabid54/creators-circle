import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { enforceRate } from '@/lib/rate-limit';

const deliverableSchema = z.object({
  type: z.enum(['post', 'story', 'reel', 'youtube_long', 'youtube_short']),
  qty: z.number().int().min(1).max(20),
});

const schema = z.object({
  title: z.string().min(3).max(120),
  brief: z.string().min(10).max(2000),
  budgetMin: z.number().int().min(0),
  budgetMax: z.number().int().min(0),
  targetNiches: z.array(z.string()).min(1).max(5),
  targetPlatforms: z.array(z.string()).min(1).max(4),
  targetCities: z.array(z.string()).default([]),
  deliverables: z.array(deliverableSchema).min(1).max(10),
  timeline: z.string().max(200).optional(),
  // Brand-initiated invite: when set, an Application is created with status "invited"
  // so the creator can see the campaign + message the brand before accepting.
  invitedCreatorId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.user.role !== 'brand') {
    return NextResponse.json({ error: 'Not a brand account' }, { status: 403 });
  }
  // 10 campaigns per hour per brand is plenty for normal operation.
  const rateCheck = enforceRate(
    req,
    { scope: 'campaigns.create', limit: 10, windowMs: 60 * 60 * 1000 },
    session.user.id,
  );
  if (!rateCheck.ok) return rateCheck.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (parsed.data.budgetMax < parsed.data.budgetMin) {
    return NextResponse.json({ error: 'budgetMax must be >= budgetMin' }, { status: 400 });
  }

  const data = parsed.data;

  const campaign = await db.campaign.create({
    data: {
      brandId: session.user.id,
      title: data.title,
      brief: data.brief,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      targetNiches: JSON.stringify(data.targetNiches),
      targetPlatforms: JSON.stringify(data.targetPlatforms),
      targetCities: JSON.stringify(data.targetCities),
      deliverables: JSON.stringify(data.deliverables),
      timeline: data.timeline ?? null,
      status: 'open',
    },
  });

  // Brand-initiated invite: create an Application in `invited` state so the
  // creator sees it in their applications and the thread is open for messaging
  // (the messages API accepts application IDs as threadIds for invites).
  if (data.invitedCreatorId) {
    try {
      await db.application.create({
        data: {
          campaignId: campaign.id,
          creatorId: data.invitedCreatorId,
          // 0 is a placeholder — the actual rate is agreed in messages or at
          // accept-time. Stored as 0 so we can distinguish "not yet agreed"
          // from a real value in the UI.
          proposedRate: 0,
          pitch:
            'You have been invited to discuss this campaign with the brand. ' +
            'Send a message to begin, or accept the invite to start work.',
          status: 'invited',
        },
      });
    } catch (err) {
      // The unique (campaignId, creatorId) constraint blocks duplicate
      // applications. If the creator already has an open application on
      // this campaign, we still return success — the campaign is created
      // and the existing application is the one the creator sees.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        return NextResponse.json({ ok: true, id: campaign.id, invited: 'already-applied' });
      }
      throw err;
    }
  }

  return NextResponse.json({ ok: true, id: campaign.id, invited: !!data.invitedCreatorId });
}

export async function GET() {
  // List open campaigns (public, for creator browse).
  const campaigns = await db.campaign.findMany({
    where: { status: 'open' },
    include: { brand: { select: { name: true, brandProfile: { select: { company: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      brief: c.brief,
      budgetMin: c.budgetMin,
      budgetMax: c.budgetMax,
      targetNiches: JSON.parse(c.targetNiches) as string[],
      targetPlatforms: JSON.parse(c.targetPlatforms) as string[],
      targetCities: c.targetCities ? (JSON.parse(c.targetCities) as string[]) : [],
      deliverables: JSON.parse(c.deliverables) as Array<{ type: string; qty: number }>,
      timeline: c.timeline,
      status: c.status,
      company: c.brand.brandProfile?.company ?? c.brand.name,
      createdAt: c.createdAt,
    })),
  });
}
