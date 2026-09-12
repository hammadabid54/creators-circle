import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare, ArrowUpRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
import { Breadcrumb } from '@/components/ui/breadcrumb';

type InboxItem = {
  /** threadId — either a Contract id or an Application id (polymorphic). */
  threadId: string;
  kind: 'contract' | 'application';
  /** Display name of the conversation partner. */
  name: string;
  partnerImage?: string;
  /** Title of the campaign that ties this conversation together. */
  campaignTitle: string;
  /** ISO timestamp of the latest activity (last message or thread creation). */
  lastActivityAt: Date;
  lastMessagePreview: string;
};

export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/messages');
  const userId = session.user.id;
  const isBrand = session.user.role === 'brand';

  // 1) Post-acceptance collaborations (Contract threads).
  const contracts = await db.contract.findMany({
    where: { OR: [{ creatorId: userId }, { brandId: userId }] },
    include: {
      creator: { select: { name: true, image: true } },
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
      campaign: { select: { title: true } },
    },
  });

  // 2) Pre-acceptance conversations (Application threads). A user is part of an
  // application thread if they are the creator, or if they are the brand that
  // owns the campaign the application is for.
  const applications = await db.application.findMany({
    where: isBrand
      ? { campaign: { brandId: userId } }
      : { creatorId: userId },
    include: {
      creator: { select: { name: true, image: true } },
      campaign: {
        select: {
          title: true,
          brandId: true,
          brand: { select: { name: true, brandProfile: { select: { company: true } } } },
        },
      },
    },
  });

  // 3) Latest message per thread, in a single round trip. We don't know
  // which threadIds are contract vs application here, so we collect them all.
  const allThreadIds = [
    ...contracts.map((c) => c.id),
    ...applications.map((a) => a.id),
  ];
  const latestMessages = allThreadIds.length
    ? await db.message.findMany({
        where: { threadId: { in: allThreadIds } },
        orderBy: { createdAt: 'desc' },
      })
    : [];
  const latestByThread = new Map<string, (typeof latestMessages)[number]>();
  for (const m of latestMessages) {
    if (!latestByThread.has(m.threadId)) latestByThread.set(m.threadId, m);
  }

  const items: InboxItem[] = [];
  for (const c of contracts) {
    const partnerIsBrand = c.brandId === userId;
    items.push({
      threadId: c.id,
      kind: 'contract',
      name: partnerIsBrand
        ? c.creator.name || 'Creator'
        : c.brand.brandProfile?.company || c.brand.name || 'Brand',
      partnerImage: partnerIsBrand ? c.creator.image || undefined : undefined,
      campaignTitle: c.campaign?.title || 'Direct collaboration',
      lastActivityAt: latestByThread.get(c.id)?.createdAt || c.updatedAt,
      lastMessagePreview: latestByThread.get(c.id)?.body || 'Collaboration conversation.',
    });
  }
  for (const a of applications) {
    const partnerIsBrand = a.campaign.brandId === userId;
    items.push({
      threadId: a.id,
      kind: 'application',
      name: partnerIsBrand
        ? a.creator.name || 'Creator'
        : a.campaign.brand.brandProfile?.company || a.campaign.brand.name || 'Brand',
      partnerImage: partnerIsBrand ? a.creator.image || undefined : undefined,
      campaignTitle: a.campaign?.title || 'Campaign',
      lastActivityAt: latestByThread.get(a.id)?.createdAt || a.updatedAt,
      lastMessagePreview:
        latestByThread.get(a.id)?.body ||
        (a.status === 'invited'
          ? 'Open the conversation to start talking about the work.'
          : a.status === 'pending'
            ? 'You can talk before applying to make sure you are a fit.'
            : 'Pre-agreement conversation.'),
    });
  }

  items.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

  return (
    <main className="cc-container max-w-4xl py-10 md:py-14">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Messages' }]} />
      <div className="mt-6">
        <p className="cc-eyebrow mb-3">Keep the conversation going</p>
        <h1 className="cc-title">Good work starts with a hello.</h1>
        <p className="cc-subtle mt-3 mb-8">
          Every active conversation — including pre-agreement chats for invitations and proposals.
        </p>
      </div>
      {items.length ? (
        <div className="cc-panel divide-y divide-anjuman-line">
          {items.map((it) => (
            <Link
              key={it.threadId}
              href={'/messages/' + it.threadId}
              className="flex gap-4 p-5 hover:bg-anjuman-bg"
            >
              <Avatar name={it.name} src={it.partnerImage} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <h2 className="font-semibold">{it.name}</h2>
                  <span className="text-xs text-anjuman-ink-soft">
                    {it.lastActivityAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <p className="text-xs text-anjuman-purple mt-1">
                  {it.campaignTitle}
                  {it.kind === 'application' && (
                    <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wider text-anjuman-ink-soft bg-[#f0e8d4] px-2 py-0.5 rounded-full align-middle">
                      Pre-agreement
                    </span>
                  )}
                </p>
                <p className="cc-subtle truncate mt-2">{it.lastMessagePreview}</p>
              </div>
              <ArrowUpRight size={17} className="text-anjuman-ink-soft shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="cc-panel text-center px-6 py-16">
          <MessageSquare size={30} className="mx-auto text-anjuman-purple mb-5" strokeWidth={1.3} />
          <h2 className="text-2xl font-semibold">Your conversations will live here.</h2>
          <p className="cc-subtle max-w-md mx-auto mt-3 mb-6">
            When you accept a proposal or invite a creator, the conversation appears here.
          </p>
          <Link
            className="cc-button cc-button-secondary"
            href={isBrand ? '/brand/campaigns' : '/creator/campaigns'}
          >
            Explore campaigns
          </Link>
        </div>
      )}
    </main>
  );
}
