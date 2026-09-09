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
  if (!['pending', 'shortlisted'].includes(status)) return null;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mt-4">
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
