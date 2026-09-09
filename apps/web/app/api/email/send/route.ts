import { NextResponse } from 'next/server';
import { createOtp, emailKey, OtpLimitError } from '@/lib/otp';
import { deliverEmailCode, emailDeliveryReady } from '@/lib/email-delivery';
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  let key: string;
  try {
    key = emailKey(body.email);
  } catch {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!emailDeliveryReady())
    return NextResponse.json(
      { error: 'Email sign-in is not available yet. Please try again later.' },
      { status: 503 },
    );
  try {
    const code = await createOtp(key);
    const result = await deliverEmailCode(key.slice(6), code);
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OtpLimitError)
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    return NextResponse.json(
      { error: 'Could not send a code. Please wait a minute and try again.' },
      { status: 503 },
    );
  }
}
