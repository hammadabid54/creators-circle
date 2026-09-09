import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOtp, emailKey, verifyOtp, OtpLimitError } from '@/lib/otp';
import { deliverEmailCode, emailDeliveryReady } from '@/lib/email-delivery';
import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  let key: string;
  try {
    key = emailKey(body.email);
  } catch {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  const userId = session.user.id;
  const email = key.slice(6);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
  if (user.email)
    return NextResponse.json(
      {
        error: 'This account already has an email. Changing it requires account recovery support.',
      },
      { status: 409 },
    );
  const others = await db.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM User WHERE lower(email)=${email} AND id!=${userId}`;
  if (others.length)
    return NextResponse.json(
      { error: 'This email cannot be added. Use a different email or sign in with it separately.' },
      { status: 409 },
    );
  try {
    if (body.action === 'verify') {
      if (typeof body.code !== 'string' || !(await verifyOtp(key, body.code, userId)))
        return NextResponse.json({ error: 'That code is invalid or expired.' }, { status: 400 });
      const result = await db.user.updateMany({
        where: { id: userId, email: null },
        data: { email, emailVerified: new Date() },
      });
      if (!result.count)
        return NextResponse.json(
          { error: 'Account changed. Reload and try again.' },
          { status: 409 },
        );
      return NextResponse.json({ ok: true });
    }
    if (body.action !== 'send')
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    if (!emailDeliveryReady())
      return NextResponse.json({ error: 'Email delivery is not configured yet.' }, { status: 503 });
    const code = await createOtp(key, userId);
    return NextResponse.json(
      { ok: true, ...(await deliverEmailCode(email, code)) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof OtpLimitError)
      return NextResponse.json({ error: error.message }, { status: 429 });
    return NextResponse.json(
      { error: 'Could not update email. Wait a minute and try again.' },
      { status: 503 },
    );
  }
}
