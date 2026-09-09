'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function EmailForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/account/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, action: sent ? 'verify' : 'send' }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        return;
      }
      if (sent) router.refresh();
      else {
        setSent(true);
        setPreview(data.devCode || '');
      }
    } catch {
      setError('Connection lost. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-semibold">Add email sign-in</h2>
      <p className="cc-subtle">
        Verify your email to sign in to this same profile by email or phone.
      </p>
      <label className="cc-label">
        Email address
        <input
          type="email"
          autoComplete="email"
          required
          readOnly={sent}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cc-field mt-2"
        />
      </label>
      {sent && (
        <label className="cc-label">
          Verification code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="cc-field mt-2"
          />
        </label>
      )}
      {preview && (
        <p>
          Local preview code: <strong>{preview}</strong>
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <button disabled={busy} className="cc-button">
        {busy ? 'Please wait…' : sent ? 'Verify and add email' : 'Send verification code'}
      </button>
      {sent && (
        <button
          type="button"
          disabled={busy}
          className="cc-link ml-4"
          onClick={() => {
            setSent(false);
            setCode('');
            setPreview('');
            setError('');
          }}
        >
          Change email or request a new code
        </button>
      )}
    </form>
  );
}
