import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowUpRight, Check, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { DeadlinePill } from '@/components/contracts/deadline-pill';
import { SignContractButton } from '@/components/contracts/contract-actions';
import { MilestoneActions } from '@/components/contracts/milestone-actions';
import { WorkflowStepper } from '@/components/contracts/workflow-stepper';
import { StatusPill, contractTone } from '@/components/ui/status-pill';
import { Glossary } from '@/components/ui/glossary';
import { ReviewForm } from '@/components/reviews/review-form';
import { StarRating } from '@/components/reviews/star-rating';
import { getReviewEligibility } from '@/lib/reviews';
import {
  getContractStatusLabel,
  MILESTONE_STATUS_LABEL,
  formatPKRAmount,
  isContractStatus,
  isMilestoneStatus,
} from '@/lib/contracts';

export default async function CreatorContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/creator/contracts/' + id);
  if (session.user.role !== 'creator') redirect('/onboarding/role');

  const contract = await db.contract.findFirst({
    where: { id, creatorId: session.user.id },
    include: {
      brand: { select: { name: true, brandProfile: { select: { company: true } } } },
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
  });
  if (!contract) notFound();

  // Revision history: submissions + reviews for this contract.
  const submissions = await db.contentSubmission.findMany({
    where: { contractId: contract.id },
    orderBy: { submittedAt: 'desc' },
    include: {
      review: { include: { reviewer: { select: { name: true, brandProfile: { select: { company: true } } } } } },
      milestone: { select: { title: true } },
    },
  });
  const reviews = submissions.filter((s) => s.review).map((s) => s.review!);

  const status = isContractStatus(contract.status) ? contract.status : 'active';
  const brand = contract.brand.brandProfile?.company || contract.brand.name || 'Brand';
  const isPendingSignature = status === 'pending_signature';
  const signedAt = contract.creatorSignedAt;
  const brandSignedAt = contract.brandSignedAt;

  // Review state for this contract (creator reviewing brand).
  const [creatorReview, brandReview, reviewEligibility] = await Promise.all([
    db.review.findUnique({
      where: { contractId_reviewerId: { contractId: contract.id, reviewerId: session.user.id } },
    }),
    db.review.findUnique({
      where: { contractId_reviewerId: { contractId: contract.id, reviewerId: contract.brandId } },
    }),
    getReviewEligibility(contract.id, session.user.id),
  ]);

  return (
    <main className="cc-container py-9 md:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Workspace', href: '/creator/dashboard' },
          { label: 'Contracts', href: '/creator/contracts' },
          { label: contract.campaign?.title || 'Contract' },
        ]}
      />
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10 mt-6">
        <aside>
          <WorkspaceNav role="creator" active="contracts" />
        </aside>
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <StatusPill tone={contractTone(status)}>
              {getContractStatusLabel(status, 'creator')}
            </StatusPill>
            {(status === 'pending_payout' ||
              status === 'pending_signature' ||
              status === 'cancelled' ||
              status === 'disputed') && (
              <Glossary term={getContractStatusLabel(status, 'creator')}>
                {status === 'pending_payout' &&
                  'All work is approved. The brand is preparing payment — payouts are processed outside Kollabo for now.'}
                {status === 'pending_signature' &&
                  'The brand has signed. Once you sign, work begins and milestones become editable.'}
                {status === 'cancelled' &&
                  'The collaboration was ended before completion. Funds, if any, follow the cancellation terms in the contract.'}
                {status === 'disputed' &&
                  'Either party raised a dispute. Our team reviews the case and decides on next steps.'}
              </Glossary>
            )}
          </div>
          <h1 className="cc-title">{contract.campaign?.title || 'Direct collaboration'}</h1>
          <WorkflowStepper current={status} />
          <p className="cc-subtle mt-2">With {brand}</p>

          {isPendingSignature && (
            <section className="cc-panel p-6 mt-6 border-2 border-anjuman-purple/40 bg-[#faf5f9]">
              <p className="text-xs text-anjuman-purple uppercase tracking-wider font-semibold mb-1">
                Awaiting your signature
              </p>
              <h2 className="text-xl font-semibold">Sign this contract to start work.</h2>
              <p className="cc-subtle mt-2 max-w-2xl">
                {brand} has accepted your proposal at {formatPKRAmount(contract.agreedRate)} and
                signed the contract. Review the terms below, then sign to confirm.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SignContractButton contractId={contract.id} />
                <Link href={'/messages/' + contract.id} className="cc-link text-sm">
                  Open the conversation first
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
              <h2 className="text-xl font-semibold">Payment is being released.</h2>
              <p className="cc-subtle mt-2 max-w-2xl">
                Every milestone has been approved. The brand is releasing your
                payout now. This contract will close once the funds have moved.
              </p>
            </section>
          )}

          <section className="cc-panel p-6 mt-6">
            <p className="cc-eyebrow mb-2">The deal</p>
            <p className="text-2xl font-semibold">{formatPKRAmount(contract.agreedRate)}</p>
            <p className="cc-subtle text-xs mt-1">Agreed rate</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="cc-subtle text-xs uppercase tracking-wider">Brand signed</p>
                <p className="mt-0.5">
                  {brandSignedAt
                    ? brandSignedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Not yet'}
                </p>
              </div>
              <div>
                <p className="cc-subtle text-xs uppercase tracking-wider">You signed</p>
                <p className="mt-0.5">
                  {signedAt
                    ? signedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
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
                        role="creator"
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
                {[creatorReview, brandReview].filter(Boolean).length} of 2 submitted
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {creatorReview ? (
                <div className="cc-panel bg-[#faf6f3] p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    Your review of {brand}
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
              ) : reviewEligibility.eligible ? (
                <ReviewForm contractId={contract.id} revieweeLabel={brand} />
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

              {brandReview ? (
                <div className="cc-panel bg-[#faf6f3] p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    {brand}&apos;s review of you
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
              ) : (
                <div className="cc-panel p-5">
                  <p className="text-[11px] uppercase tracking-[.18em] text-anjuman-ink-soft mb-2">
                    {brand}&apos;s review of you
                  </p>
                  <p className="text-sm text-anjuman-ink-soft">
                    Waiting on {brand} to leave a review. They can do so once at least one
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
                href={'/creator/campaigns/' + contract.campaignId}
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
