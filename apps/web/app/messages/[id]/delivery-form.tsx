'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function DeliveryForm({
  contractId,
  milestoneId,
  submissionId,
}: {
  contractId: string;
  milestoneId?: string;
  submissionId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [links, setLinks] = useState('');
  async function send(action: 'submit' | 'approve' | 'revise') {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/deliveries/' + contractId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'submit'
            ? {
                action,
                milestoneId,
                links: links
                  .split('\n')
                  .map((v) => v.trim())
                  .filter(Boolean),
                notes: text,
              }
            : { action, submissionId, feedback: text },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save. Try again.');
        return;
      }
      setText('');
      setLinks('');
      router.refresh();
    } catch {
      setError('Connection lost. Refresh to check whether your action saved before trying again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-3 mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        void send(submissionId ? 'revise' : 'submit');
      }}
    >
      {!submissionId && (
        <label className="cc-label">
          Work links (one per line)
          <textarea
            required
            rows={3}
            className="cc-field mt-2"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder="https://…"
          />
          <span className="cc-subtle text-xs">
            Add up to 10 links to drafts, files or published posts. Give your collaborator access
            before submitting.
          </span>
        </label>
      )}
      <label className="cc-label">
        {submissionId ? 'Review feedback (required for revisions)' : 'Submission notes (optional)'}
        <textarea
          maxLength={2000}
          rows={3}
          className="cc-field mt-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-800 text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {submissionId ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="cc-button"
              onClick={() => send('approve')}
            >
              {busy ? 'Saving…' : 'Approve deliverable'}
            </button>
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="cc-button cc-button-secondary"
            >
              Request revisions
            </button>
          </>
        ) : (
          <button disabled={busy || !links.trim()} className="cc-button">
            {busy ? 'Submitting…' : 'Submit work'}
          </button>
        )}
      </div>
    </form>
  );
}
