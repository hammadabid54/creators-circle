'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ApplicationActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function act(action: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/applications/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not update proposal.');
        return;
      }
      router.refresh();
    } catch {
      setError('Connection lost. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (!['pending', 'shortlisted', 'invited'].includes(status)) return null;

  // Direct invites are different: the brand owns the invite, so the
  // natural action is to withdraw it, not "accept" their own invite.
  // We still show a "Withdraw invite" so non-responsive creators
  // don't get ghosted forever in the brand's list.
  if (status === 'invited') {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            className="px-3 py-2 text-sm text-anjuman-ink-soft"
            disabled={busy}
            onClick={() => {
              if (confirm('Withdraw this invite? The creator will no longer see it in their applications.'))
                act('withdraw');
            }}
          >
            {busy ? 'Updating…' : 'Withdraw invite'}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-800 mt-3">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mt-4">
        {/* Shortlist only applies to open proposals, not direct invites. */}
        {status === 'pending' && (
          <button
            className="cc-button cc-button-secondary"
            disabled={busy}
            onClick={() => act('shortlist')}
          >
            Shortlist
          </button>
        )}
        <button className="cc-button" disabled={busy} onClick={() => act('accept')}>
          {busy ? 'Updating…' : 'Accept proposal'}
        </button>
        <button
          className="px-3 py-2 text-sm text-anjuman-ink-soft"
          disabled={busy}
          onClick={() => act('reject')}
        >
          Decline
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
