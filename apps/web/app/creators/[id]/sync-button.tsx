'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function sync() {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/social/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'all' }),
      });
      const data = await res.json();
      setMessage(
        res.ok
          ? 'Measurements refreshed. ' + (data.issues || []).join(' ')
          : data.error || 'Could not refresh.',
      );
      if (res.ok) router.refresh();
    } catch {
      setMessage('Connection lost. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4">
      <button className="cc-button-secondary text-sm" onClick={sync} disabled={busy}>
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Refreshing…' : 'Refresh my statistics'}
      </button>
      {message && (
        <p role="status" className="cc-subtle text-sm mt-2">
          {message}
        </p>
      )}
    </div>
  );
}
