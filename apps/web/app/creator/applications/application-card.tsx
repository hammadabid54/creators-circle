'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowUpRight, Check, X } from 'lucide-react';
import { formatPKR } from '@/lib/utils';
import { StatusPill, type PillTone } from '@/components/ui/status-pill';
import { useToast } from '@/components/ui/toast';

type AppForCard = {
  id: string;
  status: string;
  campaignId: string;
  proposedRate: number;
  pitch: string | null;
  campaign: {
    title: string;
    brand: { brandProfile: { company: string } | null } | null;
    contracts: { id: string }[];
  };
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Submitted',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
  invited: 'Invited',
};

const STATUS_TONE: Record<string, PillTone> = {
  pending: 'brand',
  shortlisted: 'warning',
  accepted: 'success',
  rejected: 'neutral',
  withdrawn: 'neutral',
  invited: 'info',
};

export function ApplicationCard({
  a,
  mode,
}: {
  a: AppForCard;
  mode: 'invitation' | 'proposal';
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | 'decline_invite' | 'accept_invite'>(null);
  const [error, setError] = useState<string | null>(null);
  // When accepting an invite, the creator supplies a proposed rate and a
  // short pitch. We stage them locally before the API call.
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [proposedRate, setProposedRate] = useState<string>('');
  const [pitch, setPitch] = useState<string>('');

  const brandName = a.campaign.brand?.brandProfile?.company || 'Brand campaign';
  const contractThread = a.campaign.contracts[0]?.id;
  const threadHref = contractThread ? `/messages/${contractThread}` : `/messages/${a.id}`;

  async function respond(action: 'accept_invite' | 'decline_invite') {
    setBusy(action);
    setError(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'accept_invite') {
        const rate = Number(proposedRate);
        if (!Number.isFinite(rate) || rate <= 0) {
          setError('Enter a proposed rate in PKR.');
          setBusy(null);
          return;
        }
        if (pitch.trim().length < 20) {
          setError('Add a short pitch (at least 20 characters).');
          setBusy(null);
          return;
        }
        body.proposedRate = Math.round(rate);
        body.pitch = pitch.trim();
      }
      const res = await fetch(`/api/applications/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Something went wrong. Please try again.');
        toast.danger(data.error ?? 'Something went wrong.');
        return;
      }
      toast.success(action === 'accept_invite' ? 'Invite accepted. The thread is now a contract conversation.' : 'Invite declined.');
      startTransition(() => router.refresh());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="cc-panel p-5 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="text-xs text-anjuman-purple mb-1">{brandName}</p>
          <Link href={'/creator/campaigns/' + a.campaignId}>
            <h2 className="text-lg font-semibold">{a.campaign.title}</h2>
          </Link>
        </div>
        <StatusPill tone={STATUS_TONE[a.status] ?? 'brand'}>
          {STATUS_LABEL[a.status] ?? a.status}
        </StatusPill>
      </div>
      {a.pitch && <p className="cc-subtle mt-4 whitespace-pre-wrap">{a.pitch}</p>}

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3"
        >
          {error}
        </p>
      )}

      {mode === 'invitation' && (
        <div className="mt-4 pt-4 border-t border-anjuman-line space-y-3">
          {showAcceptForm ? (
            <div className="space-y-3" data-testid="accept-invite-form">
              <div>
                <label className="text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
                  Your proposed rate (PKR)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="e.g. 45000"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white"
                  disabled={busy !== null || isPending}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
                  Short pitch (20-2000 chars)
                </label>
                <textarea
                  rows={3}
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Why you're a good fit for this campaign."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white"
                  disabled={busy !== null || isPending}
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAcceptForm(false)}
                  disabled={busy !== null || isPending}
                  className="cc-button cc-button-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => respond('accept_invite')}
                  disabled={busy !== null || isPending}
                  className="cc-button text-sm"
                >
                  <Check size={14} /> {busy === 'accept_invite' ? 'Submitting...' : 'Submit proposal'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <span className="cc-subtle text-sm">
                Accept to send your proposed rate. Decline if the timing isn&rsquo;t right.
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => respond('decline_invite')}
                  disabled={busy !== null || isPending}
                  className="cc-button cc-button-secondary text-sm"
                >
                  <X size={14} /> {busy === 'decline_invite' ? 'Declining...' : 'Decline'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcceptForm(true)}
                  disabled={busy !== null || isPending}
                  className="cc-button text-sm"
                >
                  <Check size={14} /> Accept
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'proposal' && (
        <div className="mt-4 pt-4 border-t border-anjuman-line flex flex-wrap gap-3 justify-between text-sm">
          <span className="text-anjuman-ink-soft">
            {a.proposedRate > 0 ? (
              <>
                Your proposal ·{' '}
                <strong className="text-anjuman-ink">{formatPKR(a.proposedRate)}</strong>
              </>
            ) : (
              <em className="text-anjuman-ink-soft">Rate to be discussed in messages</em>
            )}
          </span>
          <Link className="cc-link inline-flex gap-1 items-center" href={threadHref}>
            {contractThread ? 'Open conversation' : 'Message brand'}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
    </article>
  );
}
