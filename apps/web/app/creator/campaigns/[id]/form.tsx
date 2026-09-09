'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ApplicationForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [proposedRate, setProposedRate] = useState('');
  const [timeline, setTimeline] = useState('');
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rate = Number(proposedRate);
    if (Number.isNaN(rate) || rate < 0) {
      setError('Enter a valid rate');
      return;
    }
    if (pitch.length < 20) {
      setError('Pitch should be at least 20 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          proposedRate: rate,
          timeline: timeline || undefined,
          pitch,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? 'Failed to submit');
        return;
      }
      router.refresh();
    } catch {
      setError('Connection lost. Your proposal is still here. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="cc-panel p-6">
      <h2 className="font-display text-lg font-bold mb-1">Send your proposal</h2>
      <p className="text-sm text-anjuman-ink-soft mb-5">
        The brand will review and respond. No commitment until they accept.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="proposal-rate"
            className="block text-xs font-semibold uppercase tracking-wider text-anjuman-ink mb-2"
          >
            Your rate (PKR)
          </label>
          <input
            id="proposal-rate"
            type="number"
            max="2147483647"
            step="1"
            min="0"
            required
            value={proposedRate}
            onChange={(e) => setProposedRate(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full h-12 px-4 rounded-xl border border-anjuman-line bg-white text-base focus:outline-none focus:ring-2 focus:ring-anjuman-purple"
          />
        </div>
        <div>
          <label
            htmlFor="proposal-timeline"
            className="block text-xs font-semibold uppercase tracking-wider text-anjuman-ink mb-2"
          >
            Timeline{' '}
            <span className="text-anjuman-ink-soft normal-case font-normal">(optional)</span>
          </label>
          <input
            id="proposal-timeline"
            type="text"
            maxLength={200}
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g. 7 days, can start immediately"
            className="w-full h-12 px-4 rounded-xl border border-anjuman-line bg-white text-base focus:outline-none focus:ring-2 focus:ring-anjuman-purple"
          />
        </div>
        <div>
          <label
            htmlFor="proposal-pitch"
            className="block text-xs font-semibold uppercase tracking-wider text-anjuman-ink mb-2"
          >
            Why you?{' '}
            <span className="text-anjuman-ink-soft normal-case font-normal">(20+ chars)</span>
          </label>
          <textarea
            id="proposal-pitch"
            maxLength={2000}
            required
            minLength={20}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            rows={5}
            placeholder="Why you're a great fit, relevant past work, audience fit, ideas for the campaign..."
            className="w-full px-4 py-3 rounded-xl border border-anjuman-line bg-white text-base focus:outline-none focus:ring-2 focus:ring-anjuman-purple resize-none"
          />
          <div className="text-xs text-anjuman-ink-soft mt-1">{pitch.length} characters</div>
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}

        <Button type="submit" variant="gradient" size="lg" fullWidth disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit application
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
