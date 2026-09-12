import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowUpRight, Check, MessageSquare, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { DeadlinePill } from '@/components/contracts/deadline-pill';
import { MilestoneActions } from '@/components/contracts/milestone-actions';
import { WorkflowStepper } from '@/components/contracts/workflow-stepper';
import { StatusPill, contractTone } from '@/components/ui/status-pill';
import { Glossary } from '@/components/ui/glossary';
import { ReviewForm, AlreadyReviewedNote } from '@/components/reviews/review-form';
import { ReviewList } from '@/components/reviews/review-list';
import { StarRating } from '@/components/reviews/star-rating';
import { getReviewEligibility } from '@/lib/reviews';
import {
  getContractStatusLabel,
  MILESTONE_STATUS_LABEL,
  formatPKRAmount,
  isContractStatus,
  isMilestoneStatus,
} from '@/lib/contracts';

export default async function BrandContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/brand/contracts/' + id);
  if (session.user.role !== 'brand') redirect('/onboarding/role');

  const contract = await db.contract.findFirst({
    where: { id, brandId: session.user.id },
    include: {
      creator: {
        select: {
          name: true,
          creatorProfile: { select: { slug: true } },
        },
      },
      campaign: { select: { title: true } },
      milestones: {
        orderBy: { dueDate: 'asc' },
        include: {
          submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
            include: { review: true },
          },
        },
      },
    },
    // Revision history is the chain: Contract -> ContentSubmission -> DeliveryReview.
    // We pull all submissions for this contract and attach their review + reviewer.
  });
  if (!contract) notFound();

  const submissions = await db.contentSubmission.findMany({
    where: { contractId: contract.id },
    orderBy: { submittedAt: 'desc' },
    include: {
      review: { include: { reviewer: { select: { name: true, brandProfile: { select: { company: true } } } } } },
      milestone: { select: { title: true } },
    },
  });
  // Only show entries that have a review (i.e. the brand responded).
  const reviews = submissions.filter((s) => s.review).map((s) => s.review!);

  const status = isContractStatus(contract.status) ? contract.status : 'active';
  const creatorName = contract.creator.name || 'Creator';
  const creatorSlug = contract.creator.creatorProfile?.slug || contract.creatorId;
  const isPendingSignature = status === 'pending_signature';

  // Review state for this contract (brand reviewing creator).
  const [brandReview, creatorReview, reviewEligibility] = await Promise.all([
    db.review.findUnique({
      where: { contractId_reviewerId: { contractId: contract.id, reviewerId: session.user.id } },
    }),
    db.review.findUnique({
      where: { contractId_reviewerId: { contractId: contract.id, reviewerId: contract.creatorId } },
    }),
    getReviewEligibility(contract.id, session.user.id),
  ]);

  return (
    <main className="cc-container py-9 md:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Workspace', href: '/brand/dashboard' },
          { label: 'Contracts', href: '/brand/contracts' },
          { label: contract.campaign?.title || 'Contract' },
        ]}
      />
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10 mt-6">
        <aside>
          <WorkspaceNav role="brand" active="contracts" />
        </aside>
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <StatusPill tone={contractTone(status)}>
              {getContractStatusLabel(status, 'brand')}
            </StatusPill>
            {(status === 'pending_payout' ||
              status === 'pending_signature' ||
              status === 'cancelled' ||
              status === 'disputed') && (
              <Glossary term={getContractStatusLabel(status, 'brand')}>
                {status === 'pending_payout' &&
                  'The work is approved and the brand is preparing payment. Payout is processed outside Kollabo for now.'}
                {status === 'pending_signature' &&
                  'The contract is drafted but the other party has not signed yet. Once both signatures are in, work begins.'}
                {status === 'cancelled' &&
                  'The collaboration was ended before completion. Funds, if any, follow the cancellation terms in the contract.'}
                {status === 'disputed' &&
                  'Either party raised a dispute. Our team reviews the case and decides on next steps.'}
              </Glossary>
            )}
            <span className="text-xs text-anjuman-ink-soft">· {creatorName}</span>
          </div>
          <h1 className="cc-title">{contract.campaign?.title || 'Direct collaboration'}</h1>
          <WorkflowStepper current={status} />
          <p className="cc-subtle mt-2">
            With{' '}
            <Link href={'/creators/' + creatorSlug} className="cc-link">
              {creatorName}
            </Link>
          </p>

          {isPendingSignature && (
            <section className="cc-panel p-6 mt-6 border-2 border-anjuman-purple/40 bg-[#faf5f9]">
              <p className="text-xs text-anjuman-purple uppercase tracking-wider font-semibold mb-1">
                Awaiting creator signature
              </p>
              <h2 className="text-xl font-semibold">
                {creatorName.split(' ')[0]} hasn&rsquo;t signed yet.
              </h2>
              <p className="cc-subtle mt-2 max-w-2xl">
                The contract goes active once the creator signs. You can keep the conversation going
                in the meantime.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link href={'/messages/' + contract.id} className="cc-button">
                  <MessageSquare size={16} /> Open the conversation
                </Link>
              </div>
            </section>
          )}

          {status === 'pending_payout' && (
            <section
              data-testid="pending-payout-banner"
              className="cc-panel p-6 mt-6 border-2 border-emerald-700/30 bg-emerald-50/40"
            >
              <p className="text-xs text-emerald-800 uppercase tracking-wider font-semibold mb-1">
                All work approved
              </p>
              <h2 className="text-xl font-semibold">Releasing payout.</h2>
              <p className="cc-subtle mt-2 max-w-2xl">
                Every milestone has been approved. Funds are being released to{' '}
                {creatorName}. This contract will close once the payout completes.
              </p>
            </section>
          )}

          <section className="cc-panel p-6 mt-6">
            <p className="cc-eyebrow mb-2">The deal</p>
            <p className="text-2xl font-semibold">{formatPKRAmount(contract.agreedRate)}</p>
            <p className="cc-subtle text-xs mt-1">Agreed rate</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="cc-subtle text-xs uppercase tracking-wider">You signed</p>
                <p className="mt-0.5">
                  {contract.brandSignedAt
                    ? contract.brandSignedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Not yet'}
                </p>
              </div>
              <div>
                <p className="cc-subtle text-xs uppercase tracking-wider">Creator signed</p>
                <p className="mt-0.5">
                  {contract.creatorSignedAt
                    ? contract.creatorSignedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                    : isPendingSignature
                      ? 'Not yet'
                      : 'Not signed'}
                </p>
              </div>
            </div>
          </section>

          <section className="cc-panel p-6 mt-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold">Milestones</h2>
              <span className="cc-subtle text-xs">
                {contract.milestones.filter((m) => isMilestoneStatus(m.status) && m.status === 'approved').length} of {contract.milestones.length} approved
              </span>
            </div>
            {contract.milestones.length === 0 ? (
              <p className="cc-subtle text-sm">No milestones set yet.</p>
            ) : (
              <ul className="space-y-3">
                {contract.milestones.map((m) => {
                  const mStatus = isMilestoneStatus(m.status) ? m.status : 'pending';
                  return (
                    <li
                      key={m.id}
                      data-testid="milestone-card"
                      data-milestone-id={m.id}
                      data-milestone-status={mStatus}
                      className="border border-anjuman-line rounded-xl p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{m.title}</p>
                          <p className="cc-subtle text-xs mt-0.5">
                            {MILESTONE_STATUS_LABEL[mStatus]} · {formatPKRAmount(m.amount)}
                          </p>
                        </div>
                        <DeadlinePill due={m.dueDate} />
                      </div>
                      <MilestoneActions
                        contractId={contract.id}
                        milestone={{
                          id: m.id,
                          title: m.title,
                          status: mStatus,
                          amount: m.amount,
                          dueDate: m.dueDate ? m.dueDate.toISOString() : null,
                          submissions: m.submissions.map((s) => ({
                            id: s.id,
                            submittedAt: s.submittedAt.toISOString(),
                            fileUrls: s.fileUrls,
                            caption: s.caption,
                          })),
                        }}
                        role="brand"
                        creatorName={creatorName}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="cc-panel p-6 mt-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold">Revision history</h2>
              <span className="cc-subtle text-xs">{reviews.length} reviews</span>
            </div>
            {reviews.length === 0 ? (
              <p className="cc-subtle text-sm">No reviews or revisions yet.</p>
            ) : (
              <ol className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="border border-anjuman-line rounded-xl p-4">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <p className="text-sm font-semibold capitalize">{r.action.replaceAll('_', ' ')}</p>
                      <p className="cc-subtle text-xs">
                        {r.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <p className="cc-subtle text-xs mt-0.5">
                      {r.reviewer.brandProfile?.company || r.reviewer.name}
                    </p>
                    {r.feedback && (
                      <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{r.feedback}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="cc-panel p-6 mt-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold">Reviews</h2>
              <span className="cc-subtle text-xs">
                {[brandReview, creatorReview].filter(Boolean).length} of 2 submitted
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {brandReview ? (
                <div className="cc-panel bg-[#faf6f3] p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    Your review of {creatorName}
                  </p>
                  <StarRating value={brandReview.rating} size={16} />
                  {brandReview.body && (
                    <p className="text-sm text-anjuman-ink-soft leading-relaxed mt-2 whitespace-pre-line">
                      {brandReview.body}
                    </p>
                  )}
                  <p className="text-xs text-anjuman-ink-soft mt-3">
                    Submitted{' '}
                    {brandReview.createdAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ) : reviewEligibility.eligible ? (
                <ReviewForm contractId={contract.id} revieweeLabel={creatorName} />
              ) : (
                <div className="cc-panel p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    Leave a review
                  </p>
                  <p className="text-sm text-anjuman-ink-soft">
                    {reviewEligibility.reason}. Reviews unlock after the first milestone is
                    approved.
                  </p>
                </div>
              )}

              {creatorReview ? (
                <div className="cc-panel bg-[#faf6f3] p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    {creatorName}&apos;s review of your brand
                  </p>
                  <StarRating value={creatorReview.rating} size={16} />
                  {creatorReview.body && (
                    <p className="text-sm text-anjuman-ink-soft leading-relaxed mt-2 whitespace-pre-line">
                      {creatorReview.body}
                    </p>
                  )}
                  <p className="text-xs text-anjuman-ink-soft mt-3">
                    Submitted{' '}
                    {creatorReview.createdAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ) : (
                <div className="cc-panel p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    {creatorName}&apos;s review of your brand
                  </p>
                  <p className="text-sm text-anjuman-ink-soft">
                    Waiting on {creatorName} to leave a review. They can do so once at least one
                    milestone is approved.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 flex flex-wrap gap-3">
            <Link href={'/messages/' + contract.id} className="cc-button">
              <MessageSquare size={16} /> Open the conversation
            </Link>
            {contract.campaignId && (
              <Link
                href={'/brand/campaigns/' + contract.campaignId}
                className="cc-button cc-button-secondary"
              >
                <FileText size={16} /> View campaign brief
              </Link>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
