import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const schema = z.object({
  company: z.string().trim().min(1).max(100),
  industry: z.string().min(1).max(50).optional(),
  ntn: z.string().max(20).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(50).optional(),
  monthlyBudget: z.string().max(50).optional(),
  preferredNiches: z.array(z.string()).default([]),
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

  const data = parsed.data;
  const userId = session.user.id;

  await db.brandProfile.upsert({
    where: { userId },
    update: {
      company: data.company,
      industry: data.industry ?? null,
      ntn: data.ntn ?? null,
      website: data.website || null,
      city: data.city ?? null,
      monthlyBudget: data.monthlyBudget ?? null,
      preferredNiches: JSON.stringify(data.preferredNiches),
    },
    create: {
      userId,
      company: data.company,
      industry: data.industry ?? null,
      ntn: data.ntn ?? null,
      website: data.website || null,
      city: data.city ?? null,
      monthlyBudget: data.monthlyBudget ?? null,
      preferredNiches: JSON.stringify(data.preferredNiches),
    },
  });

  return NextResponse.json({ ok: true });
}
