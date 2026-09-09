'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';
export function Composer({ threadId }: { threadId: string }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, body }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Message not sent. Try again.');
        return;
      }
      setBody('');
      router.refresh();
    } catch {
      setError('Connection lost. Your message is still here. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="border-t border-anjuman-line p-5 bg-white">
      <label className="cc-label">
        Your message
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          required
          className="cc-field mt-2"
          placeholder="Share an idea or ask a question…"
        />
      </label>
      {error && (
        <p role="alert" className="text-red-800 text-sm mb-3">
          {error}
        </p>
      )}
      <div className="flex justify-between items-center gap-3 mt-3">
        <span className="cc-subtle text-xs">{body.length}/2,000</span>
        <button disabled={busy || !body.trim()} className="cc-button disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send message
        </button>
      </div>
    </form>
  );
}
