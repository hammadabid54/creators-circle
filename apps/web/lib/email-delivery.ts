export function emailPreviewEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.EMAIL_PREVIEW_MODE === 'true';
}
export function emailDeliveryReady() {
  return emailPreviewEnabled() || Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
export async function deliverEmailCode(email: string, code: string) {
  if (emailPreviewEnabled()) return { devCode: code };
  if (!emailDeliveryReady()) throw new Error('Email delivery is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: 'Your Creators Circle verification code',
      text: `Your Creators Circle code is ${code}. It expires in 5 minutes. Do not share this code. If you did not request it, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !(await response.json()).id) throw new Error('Email delivery failed');
  return {};
}
