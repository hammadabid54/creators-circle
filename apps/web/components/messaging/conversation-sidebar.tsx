import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  ConversationSidebarList,
  type SidebarItem,
} from '@/components/messaging/conversation-sidebar-list';
import {
  type ContractStatus,
  getContractStatusLabel,
} from '@/lib/contracts';

type ThreadRow = {
  primaryThreadId: string;
  primaryThreadKind: 'contract' | 'application';
  name: string;
  partnerImage?: string;
  campaignTitle: string;
  lastActivityAt: Date;
  lastMessagePreview: string;
  activeContract?: {
    id: string;
    title: string;
    status: ContractStatus;
    step: number;
    approvedMilestones: number;
    totalMilestones: number;
  };
  otherThreadCount: number;
};

/** Returns the step number (1..5) for the mini-stepper in the sidebar. */
function stepIndex(status: ContractStatus): number {
  switch (status) {
    case 'pending_signature':
      return 1;
    case 'active':
      return 3;
    case 'pending_payout':
      return 4;
    case 'completed':
      return 5;
    case 'cancelled':
    case 'disputed':
      return 0;
  }
}

/**
 * Server component that fetches every thread the user can see, groups by
 * (brand, creator) pair, picks a primary thread per pair, and hands the
 * list off to the client-side ConversationSidebarList for active-row
 * highlighting (the layout can't see child [id] params in Next 15).
 */
export async function ConversationSidebar() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/messages');
  const userId = session.user.id;
  const isBrand = session.user.role === 'brand';

  const [contracts, applications] = await Promise.all([
    db.contract.findMany({
      where: { OR: [{ creatorId: userId }, { brandId: userId }] },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        brand: {
          select: {
            id: true,
            name: true,
            brandProfile: { select: { company: true } },
          },
        },
        campaign: { select: { title: true } },
        milestones: { select: { status: true } },
      },
    }),
    db.application.findMany({
      where: isBrand
        ? { campaign: { brandId: userId } }
        : { creatorId: userId },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        campaign: {
          select: {
            id: true,
            title: true,
            brandId: true,
            brand: {
              select: {
                id: true,
                name: true,
                brandProfile: { select: { company: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  type PairBucket = {
    brandId: string;
    creatorId: string;
    brand: (typeof contracts)[number]['brand'];
    creator: (typeof contracts)[number]['creator'];
    contracts: typeof contracts;
    applications: typeof applications;
  };
  const pairs = new Map<string, PairBucket>();
  const keyOf = (b: string, c: string) => b + '::' + c;

  for (const c of contracts) {
    const k = keyOf(c.brandId, c.creatorId);
    let bucket = pairs.get(k);
    if (!bucket) {
      bucket = {
        brandId: c.brandId,
        creatorId: c.creatorId,
        brand: c.brand,
        creator: c.creator,
        contracts: [],
        applications: [],
      };
      pairs.set(k, bucket);
    }
    bucket.contracts.push(c);
  }
  for (const a of applications) {
    const k = keyOf(a.campaign.brandId, a.creatorId);
    let bucket = pairs.get(k);
    if (!bucket) {
      bucket = {
        brandId: a.campaign.brandId,
        creatorId: a.creatorId,
        brand: a.campaign.brand,
        creator: a.creator,
        contracts: [],
        applications: [],
      };
      pairs.set(k, bucket);
    }
    bucket.applications.push(a);
  }

  function pickPrimary(bucket: PairBucket) {
    const live = bucket.contracts.find((c) =>
      ['pending_signature', 'active', 'pending_payout'].includes(c.status),
    );
    if (live) return { kind: 'contract' as const, thread: live };
    const completed = bucket.contracts
      .filter((c) => c.status === 'completed')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    if (completed) return { kind: 'contract' as const, thread: completed };
    const recentApp = bucket.applications
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    if (recentApp) return { kind: 'application' as const, thread: recentApp };
    return null;
  }

  const allThreadIds = [
    ...contracts.map((c) => c.id),
    ...applications.map((a) => a.id),
  ];
  const latestMessages = allThreadIds.length
    ? await db.message.findMany({
        where: { threadId: { in: allThreadIds } },
        orderBy: { createdAt: 'desc' },
        select: { threadId: true, body: true, createdAt: true },
      })
    : [];
  const latestByThread = new Map<string, { body: string; createdAt: Date }>();
  for (const m of latestMessages) {
    if (!latestByThread.has(m.threadId)) {
      latestByThread.set(m.threadId, { body: m.body, createdAt: m.createdAt });
    }
  }

  const items: ThreadRow[] = [];
  for (const bucket of pairs.values()) {
    const primary = pickPrimary(bucket);
    if (!primary) continue;
    const totalThreads = bucket.contracts.length + bucket.applications.length;
    const otherThreadCount = Math.max(0, totalThreads - 1);

    let name: string;
    let partnerImage: string | undefined;
    if (isBrand) {
      name = bucket.creator.name || 'Creator';
      partnerImage = bucket.creator.image || undefined;
    } else {
      name = bucket.brand.brandProfile?.company || bucket.brand.name || 'Brand';
      partnerImage = undefined;
    }

    let lastActivityAt: Date;
    let lastMessagePreview: string;
    if (primary.kind === 'contract') {
      const c = primary.thread;
      lastActivityAt = latestByThread.get(c.id)?.createdAt || c.updatedAt;
      lastMessagePreview =
        latestByThread.get(c.id)?.body || 'Collaboration conversation.';
    } else {
      const a = primary.thread;
      lastActivityAt = latestByThread.get(a.id)?.createdAt || a.updatedAt;
      lastMessagePreview =
        latestByThread.get(a.id)?.body ||
        (a.status === 'invited'
          ? 'Open the conversation to start talking about the work.'
          : a.status === 'pending'
            ? 'You can talk before applying to make sure you are a fit.'
            : 'Pre-agreement conversation.');
    }

    let activeContract: ThreadRow['activeContract'];
    const liveContract = bucket.contracts.find((c) =>
      ['pending_signature', 'active', 'pending_payout', 'completed'].includes(
        c.status,
      ),
    );
    if (liveContract) {
      const approved = liveContract.milestones.filter(
        (m) => m.status === 'approved',
      ).length;
      activeContract = {
        id: liveContract.id,
        title: liveContract.campaign?.title || 'Direct collaboration',
        status: liveContract.status as ContractStatus,
        step: stepIndex(liveContract.status as ContractStatus),
        approvedMilestones: approved,
        totalMilestones: liveContract.milestones.length,
      };
    }

    items.push({
      primaryThreadId: primary.thread.id,
      primaryThreadKind: primary.kind,
      name,
      partnerImage,
      campaignTitle:
        primary.kind === 'contract'
          ? primary.thread.campaign?.title || 'Direct collaboration'
          : primary.thread.campaign?.title || 'Campaign',
      lastActivityAt,
      lastMessagePreview,
      activeContract,
      otherThreadCount,
    });
  }

  items.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

  if (items.length === 0) {
    return (
      <aside
        className="cc-panel p-6 h-full flex flex-col items-center justify-center text-center"
        aria-label="Conversations"
      >
        <p className="text-xs uppercase tracking-wider text-anjuman-ink-soft font-semibold">
          Conversations
        </p>
        <p className="cc-subtle text-sm mt-3">
          Nothing here yet. When a deal starts, the conversation lands in this sidebar.
        </p>
      </aside>
    );
  }

  // Serialize Date → ISO string before crossing the server/client boundary.
  const serializable: SidebarItem[] = items.map((it) => ({
    ...it,
    lastActivityAtIso: it.lastActivityAt.toISOString(),
  }));

  return (
    <aside
      className="cc-panel overflow-hidden h-full flex flex-col"
      aria-label="Conversations"
      data-testid="conversation-sidebar"
    >
      <div className="px-5 pt-5 pb-3 border-b border-anjuman-line">
        <p className="text-xs uppercase tracking-wider text-anjuman-ink-soft font-semibold">
          Conversations
        </p>
        <p className="cc-subtle text-xs mt-1">
          {items.length} {items.length === 1 ? 'partner' : 'partners'}
        </p>
      </div>
      <ConversationSidebarList items={serializable} viewerRole={isBrand ? 'brand' : 'creator'} />
    </aside>
  );
}
