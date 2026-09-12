import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Default /messages destination.
 *
 * - If the user has at least one conversation (contract or application),
 *   jump straight to the most recent one so the messenger UI feels like
 *   a real inbox — no extra click.
 * - If they have nothing yet, render an empty state in the main slot
 *   (the layout's sidebar will still show "no conversations" on the
 *   left).
 */
export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/messages');
  const userId = session.user.id;
  const isBrand = session.user.role === 'brand';

  const [mostRecentContract, mostRecentApplication] = await Promise.all([
    db.contract.findFirst({
      where: { OR: [{ creatorId: userId }, { brandId: userId }] },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, updatedAt: true },
    }),
    db.application.findFirst({
      where: isBrand
        ? { campaign: { brandId: userId } }
        : { creatorId: userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, updatedAt: true },
    }),
  ]);

  const candidates = [mostRecentContract, mostRecentApplication].filter(
    (c): c is { id: string; updatedAt: Date } => Boolean(c),
  );
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const next = candidates[0];
    if (next) redirect('/messages/' + next.id);
  }

  // No conversations yet — show an empty state in the main slot.
  return (
    <div className="cc-panel text-center px-6 py-16" data-testid="messages-empty-state">
      <MessageSquare
        size={30}
        className="mx-auto text-anjuman-purple mb-5"
        strokeWidth={1.3}
      />
      <h2 className="text-2xl font-semibold">Your conversations will live here.</h2>
      <p className="cc-subtle max-w-md mx-auto mt-3 mb-6">
        When you accept a proposal or invite a creator, the conversation appears in the
        sidebar on the left.
      </p>
      <Link
        className="cc-button cc-button-secondary"
        href={isBrand ? '/brand/campaigns' : '/creator/campaigns'}
      >
        Explore campaigns
      </Link>
    </div>
  );
}
