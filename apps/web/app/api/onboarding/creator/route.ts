import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
const publicUrl = z
  .string()
  .url()
  .max(2000)
  .refine((v) => /^https?:\/\//i.test(v), 'Use an http or https URL');
const amount = z.number().int().min(0).max(2147483647).nullable().optional();
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().max(500).optional(),
  city: z.string().min(1).max(50),
  niches: z.array(z.string()).min(1).max(5),
  languages: z.array(z.string()).min(1).max(5),
  image: publicUrl.or(z.literal('')).optional(),
  available: z.boolean().optional(),
  portfolio: z
    .array(
      z.object({
        type: z.enum(['image', 'video', 'link']),
        url: publicUrl,
        caption: z.string().max(200).optional(),
      }),
    )
    .max(6)
    .optional(),
  rateCard: z
    .object({
      postRate: amount,
      storyRate: amount,
      reelRate: amount,
      youtubeLongRate: amount,
      youtubeShortRate: amount,
    })
    .optional(),
});
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'creator')
    return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Check your profile details.' },
      { status: 400 },
    );
  const d = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { name: d.name, ...(d.image !== undefined ? { image: d.image || null } : {}) },
    });
    const fields = {
      bio: d.bio || null,
      city: d.city,
      niches: JSON.stringify(d.niches),
      languages: JSON.stringify(d.languages),
      ...(d.available !== undefined ? { available: d.available } : {}),
    };
    const profile = await tx.creatorProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...fields },
      update: fields,
    });
    if (d.rateCard)
      await tx.rateCard.upsert({
        where: { creatorId: profile.id },
        create: { creatorId: profile.id, ...d.rateCard },
        update: d.rateCard,
      });
    if (d.portfolio !== undefined) {
      await tx.portfolioItem.deleteMany({ where: { creatorId: profile.id } });
      if (d.portfolio.length)
        await tx.portfolioItem.createMany({
          data: d.portfolio.map((p) => ({ ...p, creatorId: profile.id })),
        });
    }
  });
  revalidateTag('discovery');
  return NextResponse.json({ ok: true });
}
