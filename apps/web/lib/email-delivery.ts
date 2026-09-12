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
      subject: 'Your Kollabo verification code',
      text: `Your Kollabo code is ${code}. It expires in 5 minutes. Do not share this code. If you did not request it, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !(await response.json()).id) throw new Error('Email delivery failed');
  return {};
}

/**
 * Generic transactional email for non-auth notifications (invite, contract
 * signed, work submitted, etc.). Same delivery infrastructure as the
 * sign-in code, but separate subject and body. The WhatsApp channel
 * uses this same body for the preview text; the WhatsApp provider will
 * receive the rendered template later.
 */
export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  text: string;
}) {
  if (emailPreviewEnabled()) {
    // In dev, we surface the rendered email in the response for local
    // testing. Real delivery still calls Resend.
    console.info(`[email:preview] to=${args.to} subject=${args.subject}`);
    return { ok: true, devOnly: true };
  }
  if (!emailDeliveryReady()) throw new Error('Email delivery is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [args.to],
      subject: args.subject,
      text: args.text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !(await response.json()).id) throw new Error('Email delivery failed');
  return { ok: true };
}
