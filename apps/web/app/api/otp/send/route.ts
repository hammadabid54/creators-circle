import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOtp, normalizePhone, validPhone, OtpLimitError } from '@/lib/otp';
const schema = z.object({ phone: z.string().max(30) });
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validPhone(normalizePhone(parsed.data.phone)))
    return NextResponse.json({ error: 'Enter a valid Pakistani mobile number.' }, { status: 400 });
  // Never claim a text was sent until an actual delivery integration is configured.
  if (process.env.NODE_ENV !== 'development')
    return NextResponse.json(
      { error: 'SMS sign-in is not available yet. Please try again later.' },
      { status: 503 },
    );
  try {
    const code = await createOtp(normalizePhone(parsed.data.phone));
    return NextResponse.json(
      { ok: true, devCode: code },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof OtpLimitError)
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    return NextResponse.json(
      { error: 'Could not create a code. Please try again.' },
      { status: 503 },
    );
  }
}
