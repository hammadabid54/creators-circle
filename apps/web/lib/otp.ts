import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
export const MAX_ATTEMPTS = 5;
export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}
export function emailKey(input: string) {
  const email = normalizeEmail(input);
  if (!z.string().email().max(254).safeParse(email).success) throw new Error('Invalid email');
  return 'email:' + email;
}
function validIdentifier(value: string) {
  if (validPhone(value)) return true;
  try {
    return value.startsWith('email:') && emailKey(value.slice(6)) === value;
  } catch {
    return false;
  }
}
export function normalizePhone(input: string): string {
  const value = input.replace(/[\s\-()]/g, '');
  if (value.startsWith('+92')) return '0' + value.slice(3);
  if (value.startsWith('92') && value.length === 12) return '0' + value.slice(2);
  return value;
}
export function validPhone(phone: string) {
  return /^03\d{9}$/.test(phone);
}
export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}
function digest(phone: string, code: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Authentication secret is required');
  return createHmac('sha256', secret)
    .update(phone + ':' + code)
    .digest('hex');
}
export class OtpLimitError extends Error {}
export async function createOtp(phone: string, userId?: string): Promise<string> {
  if (!validIdentifier(phone)) throw new Error('Invalid sign-in address');
  const code = generateOtpCode();
  const encoded = digest(phone, code);
  await db.$transaction(async (tx) => {
    // The write obtains SQLite's writer lock before checking limits.
    await tx.otpToken.updateMany({ where: { phone, consumed: false }, data: { consumed: true } });
    const now = new Date();
    const recent = await tx.otpToken.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    const count = await tx.otpToken.count({
      where: { phone, createdAt: { gt: new Date(+now - 3600000) } },
    });
    if (count >= 3 || (recent && +now - +recent.createdAt < 60000))
      throw new OtpLimitError('Please wait before requesting another code.');
    await tx.otpToken.create({
      data: { phone, userId, code: encoded, expires: new Date(+now + 300000) },
    });
  });
  return code;
}
export async function verifyOtp(phone: string, code: string, userId?: string): Promise<boolean> {
  if (!validIdentifier(phone) || !/^\d{6}$/.test(code)) return false;
  const token = await db.otpToken.findFirst({
    where: { phone },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  if (
    !token ||
    token.userId !== (userId ?? null) ||
    token.consumed ||
    token.attempts >= MAX_ATTEMPTS ||
    +token.expires <= Date.now()
  )
    return false;
  const actual = Buffer.from(token.code, 'hex');
  const expected = Buffer.from(digest(phone, code), 'hex');
  const matches = actual.length === expected.length && timingSafeEqual(actual, expected);
  // A conditional increment serializes all guesses; only one consumer can win.
  const result = await db.otpToken.updateMany({
    where: {
      id: token.id,
      consumed: false,
      attempts: { lt: MAX_ATTEMPTS },
      expires: { gt: new Date() },
    },
    data: { attempts: { increment: 1 }, ...(matches ? { consumed: true } : {}) },
  });
  return matches && result.count === 1;
}
