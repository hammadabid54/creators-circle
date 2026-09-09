import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DeliveryForm } from './delivery-form';
import { Composer } from './composer';

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=' + encodeURIComponent('/messages/' + id));

  // Resolve threadId. Try the contract first (post-acceptance collaboration),
  // then fall back to an application (pre-acceptance — brand invites or
  // creator applications). The same threadId field on the Message model
  // holds either, so the API and inbox can both work for invites.
  const contract = await db.contract.findFirst({
    where: { id, OR: [{ creatorId: session.user.id }, { brandId: session.user.id }] },
    include: {
      milestones: {
        orderBy: { createdAt: 'asc' },
        include: {
          submissions: {
            orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
            include: { review: true },
          },
        },
      },
      campaign: { select: { title: true } },
      creator: { select: { name: true } },
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
    },
  });

  // Messages for the contract thread. Fetched separately because the
  // Message schema no longer has a typed relation to Contract (threadId
  // is a polymorphic string that may be a contractId or applicationId).
  const contractMessages = contract
    ? await db.message.findMany({
        where: { threadId: id },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  if (!contract) {
    // Application thread: look up the application, then fetch the related
    // creator and campaign details in separate queries. We avoid
    // `include` here because the polymorphic threadId means messages are
    // fetched separately anyway, and the team was right to be careful
    // about what gets included in a thread lookup.
    const application = await db.application.findUnique({ where: { id } });
    if (application) {
      // Fetch related records in parallel and check participation.
      const [creator, campaign, appMessages] = await Promise.all([
        db.user.findUnique({
          where: { id: application.creatorId },
          select: { name: true },
        }),
        db.campaign.findUnique({
          where: { id: application.campaignId },
          select: {
            brandId: true,
            title: true,
            brand: { select: { name: true, brandProfile: { select: { company: true } } } },
          },
        }),
        db.message.findMany({
          where: { threadId: id },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const isBrand = campaign?.brandId === session.user.id;
      const isCreator = application.creatorId === session.user.id;
      if (!isBrand && !isCreator) notFound();

      const appName = isCreator
        ? campaign?.brand.brandProfile?.company || campaign?.brand.name || 'Brand'
        : creator?.name || 'Creator';

      return (
        <main className="cc-container max-w-4xl py-8 md:py-12">
          <Link href="/messages" className="cc-link text-sm inline-flex gap-2 items-center mb-6">
            <ArrowLeft size={15} />
            All conversations
          </Link>
          <h1 className="cc-title mb-3">{campaign?.title || 'Direct conversation'}</h1>
          <p className="cc-subtle mb-6">
            Conversation with {appName}{' '}
            <span className="ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-anjuman-yellow/25 text-anjuman-ink">
              Pre-agreement
            </span>
          </p>
          <div className="cc-panel p-5 md:p-7 mb-6">
            <p className="cc-eyebrow mb-2">Before the deal</p>
            <h2 className="text-2xl font-semibold">Talk it through first</h2>
            <p className="cc-subtle mt-2">
              Messages here happen before a contract exists. When you both agree on scope and
              rate, the brand can accept the proposal and a contract with milestones is created.
              After that, deliverables and approvals live in the collaboration view.
            </p>
          </div>
          <div className="cc-panel overflow-hidden">
            <div className="p-5 md:p-7 border-b border-anjuman-line">
              <p className="cc-eyebrow mb-2">Your conversation</p>
              <h2 className="text-2xl font-semibold">Messages with {appName}</h2>
              <p className="cc-subtle mt-2">{campaign?.title}</p>
            </div>
            <div className="p-5 md:p-7 min-h-[260px] space-y-5">
              {appMessages.length ? (
                appMessages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      'flex ' + (m.senderId === session.user.id ? 'justify-end' : 'justify-start')
                    }
                  >
                    <div
                      className={
                        'max-w-[85%] rounded-xl p-4 ' +
                        (m.senderId === session.user.id ? 'bg-[#eee3eb]' : 'bg-anjuman-line-soft')
                      }
                    >
                      <p className="text-xs text-anjuman-ink-soft mb-2">
                        {m.senderId === session.user.id ? 'You' : appName}
                      </p>
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {m.body}
                      </p>
                      <time
                        className="text-xs text-anjuman-ink-soft mt-2 block"
                        dateTime={m.createdAt.toISOString()}
                      >
                        {m.createdAt.toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="cc-subtle text-center py-14">
                  Introduce yourself and start the conversation.
                </p>
              )}
            </div>
            <Composer threadId={id} />
          </div>
        </main>
      );
    }
    notFound();
  }

  const name =
    contract.brandId === session.user.id
      ? contract.creator.name || 'Creator'
      : contract.brand.brandProfile?.company || contract.brand.name || 'Brand';
  return (
    <main className="cc-container max-w-4xl py-8 md:py-12">
      <Link href="/messages" className="cc-link text-sm inline-flex gap-2 items-center mb-6">
        <ArrowLeft size={15} />
        All conversations
      </Link>
      <h1 className="cc-title mb-3">{contract.campaign?.title || 'Your collaboration'}</h1>
      <p className="cc-subtle mb-6">Working with {name}</p>
      <section className="cc-panel p-5 md:p-7 mb-6" aria-label="Delivery workspace">
        <p className="cc-eyebrow mb-2">From idea to finished work</p>
        <h2 className="text-2xl font-semibold">Work & approvals</h2>
        <p className="cc-subtle mt-2">
          {contract.status === 'completed'
            ? 'All deliverables approved. This collaboration is complete.'
            : 'Share work, review each version, and keep feedback together.'}
        </p>
        {!['active', 'pending_funding', 'completed'].includes(contract.status) && (
          <p role="status" className="mt-3">
            This collaboration is {contract.status}. Submissions and reviews are closed.
          </p>
        )}
        {!contract.milestones.length && (
          <p className="cc-subtle mt-4">No deliverables have been set up for this collaboration.</p>
        )}
        {contract.milestones.map((m) => (
          <article key={m.id} className="mt-6 border-t border-anjuman-line pt-5">
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="text-lg font-semibold">{m.title}</h3>
              <span className="text-sm font-medium">
                {{
                  pending: 'Awaiting work',
                  submitted: 'In review',
                  revision_requested: 'Changes requested',
                  approved: 'Approved',
                }[m.status] || m.status}
              </span>
            </div>
            {m.dueDate && (
              <p className="cc-subtle text-sm">Due {m.dueDate.toLocaleDateString('en-GB')}</p>
            )}
            {m.submissions.map((s, i) => (
              <div key={s.id} className="bg-anjuman-line-soft rounded-lg p-4 mt-4">
                <p className="font-medium">
                  Version {m.submissions.length - i} &middot; {s.submittedAt.toLocaleString('en-GB')}
                </p>
                {s.caption && <p className="whitespace-pre-wrap break-words my-3">{s.caption}</p>}
                <ul className="space-y-2 my-3">
                  {workLinks(s.fileUrls).map((url, j) => (
                    <li key={j}>
                      <a
                        className="cc-link break-all"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View work {j + 1} (opens in new tab)
                      </a>
                    </li>
                  ))}
                </ul>
                {s.review && (
                  <div className="border-t border-anjuman-line pt-3">
                    <p className="font-medium">
                      {s.review.action === 'approve' ? 'Approved' : 'Revisions requested'} &middot;{' '}
                      {s.review.createdAt.toLocaleString('en-GB')}
                    </p>
                    <p className="whitespace-pre-wrap break-words mt-2">
                      {s.review.feedback || 'Approved without additional feedback.'}
                    </p>
                  </div>
                )}
                {['active', 'pending_funding'].includes(contract.status) &&
                  contract.brandId === session.user.id &&
                  s.status === 'pending' &&
                  m.status === 'submitted' &&
                  i === 0 && <DeliveryForm contractId={id} submissionId={s.id} />}
              </div>
            ))}
            {['active', 'pending_funding'].includes(contract.status) &&
              contract.creatorId === session.user.id &&
              ['pending', 'revision_requested'].includes(m.status) && (
                <DeliveryForm contractId={id} milestoneId={m.id} />
              )}
            {m.status === 'submitted' && contract.creatorId === session.user.id && (
              <p role="status" className="cc-subtle mt-3">
                Your work is with the brand for review.
              </p>
            )}
          </article>
        ))}
      </section>
      <div className="cc-panel overflow-hidden">
        <div className="p-5 md:p-7 border-b border-anjuman-line">
          <p className="cc-eyebrow mb-2">Your collaboration</p>
          <h2 className="text-2xl font-semibold">Messages with {name}</h2>
          <p className="cc-subtle mt-2">{contract.campaign?.title || 'Direct collaboration'}</p>
        </div>
        <div className="p-5 md:p-7 min-h-[260px] space-y-5">
          {contractMessages.length ? (
            contractMessages.map((m) => (
              <div
                key={m.id}
                className={
                  'flex ' + (m.senderId === session.user.id ? 'justify-end' : 'justify-start')
                }
              >
                <div
                  className={
                    'max-w-[85%] rounded-xl p-4 ' +
                    (m.senderId === session.user.id ? 'bg-[#eee3eb]' : 'bg-anjuman-line-soft')
                  }
                >
                  <p className="text-xs text-anjuman-ink-soft mb-2">
                    {m.senderId === session.user.id ? 'You' : name}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {m.body}
                  </p>
                  <time
                    className="text-xs text-anjuman-ink-soft mt-2 block"
                    dateTime={m.createdAt.toISOString()}
                  >
                    {m.createdAt.toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </div>
            ))
          ) : (
            <p className="cc-subtle text-center py-14">
              Introduce yourself and start planning the work.
            </p>
          )}
        </div>
        <Composer threadId={id} />
      </div>
    </main>
  );
}

function workLinks(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string' && /^https?:\/\//i.test(v))
      : [];
  } catch {
    return [];
  }
}
