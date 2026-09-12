'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function PublishButton({ published }: { published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/creator/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not update publish state. Please try again.');
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || isPending}
        data-testid={published ? 'unpublish-button' : 'publish-button'}
        className="cc-button text-sm"
      >
        {published
          ? busy || isPending
            ? 'Unpublishing...'
            : 'Unpublish'
          : busy || isPending
            ? 'Publishing...'
            : 'Publish my profile'}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
