import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
const schema = z.object({ threadId: z.string().min(1), body: z.string().trim().min(1).max(2000) });
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Write a message of 1–2,000 characters.' }, { status: 400 });
  const contract = await db.contract.findUnique({
    where: { id: parsed.data.threadId },
    select: { creatorId: true, brandId: true },
  });
  if (!contract) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (contract.creatorId !== session.user.id && contract.brandId !== session.user.id)
    return NextResponse.json(
      { error: 'You are not a participant in this conversation' },
      { status: 403 },
    );
  const message = await db.message.create({
    data: { threadId: parsed.data.threadId, senderId: session.user.id, body: parsed.data.body },
  });
  return NextResponse.json({ ok: true, id: message.id, createdAt: message.createdAt });
}
