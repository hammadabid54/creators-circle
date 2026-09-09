import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare, ArrowUpRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/messages');
  const contracts = await db.contract.findMany({
    where: { OR: [{ creatorId: session.user.id }, { brandId: session.user.id }] },
    include: {
      creator: { select: { name: true, image: true } },
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
      campaign: { select: { title: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  contracts.sort(
    (a, b) =>
      (b.messages[0]?.createdAt || b.updatedAt).getTime() -
      (a.messages[0]?.createdAt || a.updatedAt).getTime(),
  );
  return (
    <main className="cc-container max-w-4xl py-10 md:py-14">
      <p className="cc-eyebrow mb-3">Keep the conversation going</p>
      <h1 className="cc-title">Good work starts with a hello.</h1>
      <p className="cc-subtle mt-3 mb-8">Conversations for your accepted collaborations.</p>
      {contracts.length ? (
        <div className="cc-panel divide-y divide-anjuman-line">
          {contracts.map((c) => {
            const isBrand = c.brandId === session.user.id;
            const name = isBrand
              ? c.creator.name || 'Creator'
              : c.brand.brandProfile?.company || c.brand.name || 'Brand';
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
                      {(c.messages[0]?.createdAt || c.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-anjuman-purple mt-1">
                    {c.campaign?.title || 'Direct collaboration'}
                  </p>
                  <p className="cc-subtle truncate mt-2">
                    {c.messages[0]?.body || 'Your collaboration is ready for a conversation.'}
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
