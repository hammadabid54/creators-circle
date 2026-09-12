'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';

// Client component for the brand/creator actions on a contract.
// Creator sign-off lives here because it needs a fetch + revalidate.
export function SignContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sign() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/contracts/' + contractId + '/sign', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not sign the contract.');
        return;
      }
      router.refresh();
    } catch {
      setError('Connection lost. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={sign}
        className="cc-button"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {busy ? 'Signing…' : 'Sign and start work'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-800 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
