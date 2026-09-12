'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, RotateCcw, Link2, Loader2, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

type Submission = {
  id: string;
  submittedAt: string | Date;
  fileUrls: string;
  caption: string | null;
};

type Milestone = {
  id: string;
  title: string;
  status: string;
  amount: number;
  dueDate: string | Date | null;
  submissions: Submission[];
};

/**
 * Inline actions for a single milestone on the contract detail page.
 *
 *  Brand   pending            → "Message creator" button (open the thread)
 *  Brand   submitted          → inline Approve / Request revision
 *  Brand   revision_requested → italic waiting note
 *  Brand   approved           → green check
 *
 *  Creator pending            → inline submit form (links + notes)
 *  Creator revision_requested → inline resubmit form (links + notes)
 *  Creator submitted          → read-only submission preview
 *  Creator approved           → green check
 */
export function MilestoneActions({
  contractId,
  milestone,
  role,
  creatorName,
}: {
  contractId: string;
  milestone: Milestone;
  role: 'brand' | 'creator';
  creatorName?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | 'approve' | 'revise' | 'submit'>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReviseForm, setShowReviseForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitLinks, setSubmitLinks] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');

  const latest = milestone.submissions[0];
  const links: string[] = (() => {
    if (!latest) return [];
    try {
      const parsed = JSON.parse(latest.fileUrls) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string');
    } catch {
      // not JSON; treat as a single URL
    }
    return typeof latest.fileUrls === 'string' && latest.fileUrls
      ? [latest.fileUrls]
      : [];
  })();

  async function sendReview(action: 'approve' | 'revise') {
    if (action === 'revise' && feedback.trim().length === 0) {
      setError('Add a short note about what needs to change.');
      return;
    }
    if (!latest) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/deliveries/${contractId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          submissionId: latest.id,
          feedback: action === 'revise' ? feedback.trim() : '',
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not save your decision. Please try again.');
        return;
      }
      setShowReviseForm(false);
      setFeedback('');
      toast.success(action === 'approve' ? 'Milestone approved.' : 'Revision request sent.');
      startTransition(() => router.refresh());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function sendSubmit() {
    const cleanedLinks = submitLinks
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);
    if (cleanedLinks.length === 0) {
      setError('Add at least one link to your draft (one per line).');
      return;
    }
    setBusy('submit');
    setError(null);
    try {
      const res = await fetch(`/api/deliveries/${contractId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          milestoneId: milestone.id,
          links: cleanedLinks,
          notes: submitNotes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not submit. Please try again.');
        return;
      }
      setSubmitLinks('');
      setSubmitNotes('');
      setShowSubmitForm(false);
      toast.success('Work submitted for review.');
      startTransition(() => router.refresh());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const threadHref = `/messages/${contractId}`;

  // ── Creator side ────────────────────────────────────────────────────
  if (role === 'creator') {
    const canSubmit = milestone.status === 'pending' || milestone.status === 'revision_requested';
    return (
      <div className="mt-3 space-y-3">
        {latest && (
          <div className="bg-[#faf8f5] border border-anjuman-line rounded-lg p-3 text-sm space-y-2">
            <p className="cc-subtle text-xs">
              Submitted{' '}
              {new Date(latest.submittedAt).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            {links.length > 0 && (
              <ul className="space-y-1">
                {links.map((u) => (
                  <li key={u} className="flex items-center gap-1.5 break-all">
                    <Link2 size={12} className="shrink-0 text-anjuman-purple" />
                    <a
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cc-link text-xs"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {latest.caption && (
              <p className="cc-subtle text-xs italic whitespace-pre-wrap">
                "{latest.caption}"
              </p>
            )}
          </div>
        )}

        {milestone.status === 'revision_requested' && latest && (
          <p className="text-xs text-amber-700 font-medium">
            Revisions were requested. Update your draft and resubmit below.
          </p>
        )}

        {milestone.status === 'approved' && (
          <p className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
            <Check size={12} /> Approved
          </p>
        )}

        {milestone.status === 'submitted' && (
          <p className="text-xs text-anjuman-ink-soft italic">
            Your work is with the brand for review.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3"
          >
            {error}
          </p>
        )}

        {canSubmit && !showSubmitForm && (
          <button
            type="button"
            onClick={() => setShowSubmitForm(true)}
            data-testid="creator-submit-toggle"
            className="cc-button text-sm"
          >
            <Send size={14} /> {milestone.status === 'revision_requested' ? 'Resubmit work' : 'Submit work'}
          </button>
        )}

        {canSubmit && showSubmitForm && (
          <div className="space-y-3 border-t border-anjuman-line pt-3" data-testid="creator-submit-form">
            <label className="block text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
              Work links (one per line)
            </label>
            <textarea
              rows={3}
              value={submitLinks}
              onChange={(e) => setSubmitLinks(e.target.value)}
              placeholder="https://instagram.com/p/your-reel-link"
              className="w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white text-sm font-mono"
              disabled={busy !== null || isPending}
            />
            <label className="block text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              maxLength={2000}
              value={submitNotes}
              onChange={(e) => setSubmitNotes(e.target.value)}
              placeholder="Anything the brand should know about this draft."
              className="w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white text-sm"
              disabled={busy !== null || isPending}
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSubmitForm(false);
                  setSubmitLinks('');
                  setSubmitNotes('');
                  setError(null);
                }}
                disabled={busy !== null || isPending}
                className="cc-button cc-button-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => sendSubmit()}
                disabled={busy !== null || isPending}
                data-testid="creator-submit-button"
                className="cc-button text-sm"
              >
                {busy === 'submit' || isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Send size={14} /> Submit work
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Brand side ──────────────────────────────────────────────────────
  return (
    <div className="mt-3 space-y-3">
      {latest && (
        <div className="bg-[#faf8f5] border border-anjuman-line rounded-lg p-3 text-sm space-y-2">
          <p className="cc-subtle text-xs">
            Submitted{' '}
            {new Date(latest.submittedAt).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          {links.length > 0 && (
            <ul className="space-y-1">
              {links.map((u) => (
                <li key={u} className="flex items-center gap-1.5 break-all">
                  <Link2 size={12} className="shrink-0 text-anjuman-purple" />
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cc-link text-xs"
                  >
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {latest.caption && (
            <p className="cc-subtle text-xs italic whitespace-pre-wrap">
              "{latest.caption}"
            </p>
          )}
        </div>
      )}

      {/* Brand sees a clear "nudge the creator" action when nothing has been submitted yet. */}
      {!latest && milestone.status === 'pending' && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 bg-[#faf8f5] border border-dashed border-anjuman-line rounded-lg p-3"
          data-testid="brand-nudge-cta"
        >
          <p className="text-xs text-anjuman-ink-soft">
            {creatorName ? `${creatorName.split(' ')[0]} will` : 'The creator will'} submit their work here for
            your review.
          </p>
          <Link href={threadHref} className="cc-button cc-button-secondary text-xs whitespace-nowrap">
            <MessageSquare size={12} /> Message {creatorName ? creatorName.split(' ')[0] : 'creator'}
          </Link>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3"
        >
          {error}
        </p>
      )}

      {milestone.status === 'submitted' && !showReviseForm && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => sendReview('approve')}
            disabled={busy !== null || isPending}
            data-testid="inline-approve-button"
            className="cc-button text-sm"
          >
            {busy === 'approve' || isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Approving...
              </>
            ) : (
              <>
                <Check size={14} /> Approve milestone
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowReviseForm(true)}
            disabled={busy !== null || isPending}
            data-testid="inline-revise-button"
            className="cc-button cc-button-secondary text-sm"
          >
            <RotateCcw size={14} /> Request revision
          </button>
        </div>
      )}

      {milestone.status === 'submitted' && showReviseForm && (
        <div className="space-y-2" data-testid="inline-revise-form">
          <label className="text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
            What needs to change?
          </label>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={2000}
            placeholder="Be specific so the creator can address the issues."
            className="w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white text-sm"
            disabled={busy !== null || isPending}
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowReviseForm(false);
                setFeedback('');
                setError(null);
              }}
              disabled={busy !== null || isPending}
              className="cc-button cc-button-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => sendReview('revise')}
              disabled={busy !== null || isPending}
              data-testid="inline-revise-submit"
              className="cc-button text-sm"
            >
              {busy === 'revise' ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Sending...
                </>
              ) : (
                'Send revision request'
              )}
            </button>
          </div>
        </div>
      )}

      {milestone.status === 'revision_requested' && (
        <p className="text-xs text-anjuman-ink-soft italic">
          Revision requested. Waiting for the creator to resubmit.
        </p>
      )}

      {milestone.status === 'approved' && (
        <p className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
          <Check size={12} /> Approved
        </p>
      )}
    </div>
  );
}
