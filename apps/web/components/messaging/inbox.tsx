import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare, ArrowUpRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';

export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/messages');
  const userId = session.user.id;
  const contracts = await db.contract.findMany({
    where: { OR: [{ creatorId: userId }, { brandId: userId }] },
    include: {
      creator: { select: { name: true, image: true } },
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
      campaign: { select: { title: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch the latest message per contract in one query, then merge.
  const contractIds = contracts.map((c) => c.id);
  const latestMessages = contractIds.length
    ? await db.message.findMany({
        where: { threadId: { in: contractIds } },
        orderBy: { createdAt: 'desc' },
      })
    : [];
  // Keep only the latest message per threadId.
  const latestByThread = new Map<string, (typeof latestMessages)[number]>();
  for (const m of latestMessages) {
    if (!latestByThread.has(m.threadId)) latestByThread.set(m.threadId, m);
  }

  contracts.sort((a, b) => {
    const aTime = (latestByThread.get(a.id)?.createdAt || a.updatedAt).getTime();
    const bTime = (latestByThread.get(b.id)?.createdAt || b.updatedAt).getTime();
    return bTime - aTime;
  });

  return (
    <main className="cc-container max-w-4xl py-10 md:py-14">
      <p className="cc-eyebrow mb-3">Keep the conversation going</p>
      <h1 className="cc-title">Good work starts with a hello.</h1>
      <p className="cc-subtle mt-3 mb-8">Conversations for your accepted collaborations.</p>
      {contracts.length ? (
        <div className="cc-panel divide-y divide-anjuman-line">
          {contracts.map((c) => {
            const isBrand = c.brandId === userId;
            const name = isBrand
              ? c.creator.name || 'Creator'
              : c.brand.brandProfile?.company || c.brand.name || 'Brand';
            const lastMessage = latestByThread.get(c.id);
            return (
              <Link
                key={c.id}
                href={'/messages/' + c.id}
                className="flex gap-4 p-5 hover:bg-anjuman-bg"
              >
                <Avatar name={name} src={isBrand ? c.creator.image || undefined : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <h2 className="font-semibold">{name}</h2>
                    <span className="text-xs text-anjuman-ink-soft">
                      {(lastMessage?.createdAt || c.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-anjuman-purple mt-1">
                    {c.campaign?.title || 'Direct collaboration'}
                  </p>
                  <p className="cc-subtle truncate mt-2">
                    {lastMessage?.body || 'Your collaboration is ready for a conversation.'}
                  </p>
                </div>
                <ArrowUpRight size={17} className="text-anjuman-ink-soft shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="cc-panel text-center px-6 py-16">
          <MessageSquare size={30} className="mx-auto text-anjuman-purple mb-5" strokeWidth={1.3} />
          <h2 className="text-2xl font-semibold">Your conversations will live here.</h2>
          <p className="cc-subtle max-w-md mx-auto mt-3 mb-6">
            Once a proposal is accepted, you and your collaborator can discuss the work here.
          </p>
          <Link
            className="cc-button cc-button-secondary"
            href={session.user.role === 'brand' ? '/brand/campaigns' : '/creator/campaigns'}
          >
            Explore campaigns
          </Link>
        </div>
      )}
    </main>
  );
}
