import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

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
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.user.role !== 'brand') {
    return NextResponse.json({ error: 'Not a brand account' }, { status: 403 });
  }

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

  return NextResponse.json({ ok: true, id: campaign.id });
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
