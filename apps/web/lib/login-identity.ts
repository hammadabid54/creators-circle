import { db } from '@/lib/db';
import { emailKey, normalizePhone, verifyOtp } from '@/lib/otp';

export async function authorizeIdentity(input: { email?: string; phone?: string; code: string }) {
  if (Boolean(input.email) === Boolean(input.phone)) return null;
  if (input.email) {
    let key: string;
    try {
      key = emailKey(input.email);
    } catch {
      return null;
    }
    if (!(await verifyOtp(key, input.code))) return null;
    const email = key.slice(6);
    const existing = await db.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM User WHERE lower(email)=${email}`;
    if (existing.length > 1) return null;
    if (existing[0])
      return db.user.update({ where: { id: existing[0].id }, data: { emailVerified: new Date() } });
    return db.user.upsert({
      where: { email },
      create: { email, emailVerified: new Date() },
      update: { emailVerified: new Date() },
    });
  }
  const phone = normalizePhone(input.phone!);
  if (!(await verifyOtp(phone, input.code))) return null;
  return db.user.upsert({
    where: { phone },
    create: { phone, phoneVerified: new Date() },
    update: { phoneVerified: new Date() },
  });
}
