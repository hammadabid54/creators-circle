'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';

type Campaign = { id: string; title: string; budgetMin: number; budgetMax: number };

function formatPKR(amount: number): string {
  return 'PKR ' + (amount || 0).toLocaleString('en-PK');
}

export function InviteForm({
  creatorId,
  creatorName,
  campaigns,
}: {
  creatorId: string;
  creatorName: string;
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? '');
  const [message, setMessage] = useState<string>(
    `Hi ${creatorName}! I came across your profile and would love to discuss this campaign with you.`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!campaignId) {
      setError('Pick a campaign first.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/applications/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, creatorId, message }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not send the invite. Please try again.');
        return;
      }
      startTransition(() => router.push('/brand/campaigns'));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cc-panel p-6 space-y-5" data-testid="invite-form">
      <div>
        <label className="text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
          Campaign
        </label>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white"
          disabled={busy || isPending}
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({formatPKR(c.budgetMin)} – {formatPKR(c.budgetMax)})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-anjuman-ink-soft uppercase tracking-wider">
          Opening message (optional, max 2000 chars)
        </label>
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-anjuman-line bg-white"
          disabled={busy || isPending}
        />
        <p className="text-xs text-anjuman-ink-soft mt-1">
          {message.length} / 2000
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy || isPending}
          className="cc-button"
        >
          <Send size={16} /> {busy || isPending ? 'Sending invite...' : 'Send invite'}
        </button>
      </div>
    </div>
  );
}
