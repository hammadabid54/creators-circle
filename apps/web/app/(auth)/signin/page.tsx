'use client';
import { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

// Inline Google "G" mark — colors are part of Google's brand spec for "Sign in with Google".
function GoogleGMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 19.7-8.8 19.7-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5.1l-6-5c-2 1.4-4.5 2.3-7 2.3-5.2 0-9.6-3.3-11.3-8l-6.6 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6 5c-.4.4 6.3-4.6 6.3-14.6 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="cc-container py-20">Loading sign in…</div>}>
      <SignInForm />
    </Suspense>
  );
}
function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('callbackUrl') || '/onboarding/role';
  const callbackUrl =
    raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\') ? raw : '/onboarding/role';
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [hasGoogle, setHasGoogle] = useState(false);
  useEffect(() => {
    // Discover which OAuth providers are configured (Google only for now).
    let cancelled = false;
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((providers: Record<string, unknown>) => {
        if (!cancelled) setHasGoogle(Boolean(providers?.google));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  async function startGoogle() {
    setError('');
    await signIn('google', { callbackUrl });
  }
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(method === 'email' ? '/api/email/send' : '/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method === 'email' ? { email } : { phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send your code. Try again.');
        return;
      }
      setDevCode(data.devCode || '');
      setStep('code');
      setCooldown(60);
    } catch {
      setError('Connection lost. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await signIn('credentials', {
        ...(method === 'email' ? { email } : { phone }),
        code,
        redirect: false,
      });
      if (res?.error || !res) {
        setError('That code is invalid or has expired. Check it or request a new one.');
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="cc-container py-10 md:py-16">
      <div className="grid lg:grid-cols-2 max-w-5xl mx-auto cc-panel overflow-hidden">
        <section className="hidden lg:flex flex-col justify-between bg-[#392333] text-white p-12 min-h-[560px]">
          <p className="text-xs uppercase tracking-[.16em] text-[#dfc5d4]">
            A place for your next chapter
          </p>
          <div>
            <h2 className="text-4xl leading-tight font-medium">
              A good connection
              <br />
              can change everything.
            </h2>
            <p className="text-[#dfc5d4] leading-relaxed mt-6 max-w-sm">
              A community for independent creators and the brands who value their perspective.
            </p>
          </div>
          <p className="text-sm text-[#dfc5d4]">Kollabo · Pakistan</p>
        </section>
        <section className="p-6 sm:p-10 lg:p-12 self-center">
          <Link
            href="/"
            className="text-sm text-anjuman-ink-soft inline-flex gap-2 items-center mb-8"
          >
            <ArrowLeft size={14} />
            Back to the circle
          </Link>
          <p className="cc-eyebrow mb-3">{step === 'phone' ? 'Welcome in' : 'One last step'}</p>
          <h1 className="text-3xl font-semibold mb-3">
            {step === 'phone'
              ? 'Your circle is waiting.'
              : method === 'email'
                ? 'Check your email.'
                : 'Check your phone.'}
          </h1>
          <p className="cc-subtle mb-7">
            {step === 'phone'
              ? 'Sign in or create an account with an email address or Pakistani mobile number.'
              : 'Enter the six-digit code for ' +
                (method === 'email' ? email : phone) +
                '. It expires in five minutes.'}
          </p>
          {step === 'phone' && hasGoogle && (
            <button
              type="button"
              disabled={busy}
              onClick={startGoogle}
              className="cc-button cc-button-secondary w-full mb-5 inline-flex items-center justify-center gap-2"
            >
              <GoogleGMark />
              Continue with Google
            </button>
          )}
          {step === 'phone' && hasGoogle && (
            <div className="flex items-center gap-3 mb-5 text-xs text-anjuman-ink-soft">
              <span className="h-px flex-1 bg-anjuman-line" />
              or
              <span className="h-px flex-1 bg-anjuman-line" />
            </div>
          )}
          {step === 'phone' && (
            <div className="flex gap-2 mb-5" aria-label="Sign-in method">
              {(['email', 'phone'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={busy}
                  aria-pressed={method === m}
                  className={method === m ? 'cc-button' : 'cc-button cc-button-secondary'}
                  onClick={() => {
                    setMethod(m);
                    setError('');
                    setDevCode('');
                  }}
                >
                  {m === 'email' ? 'Email' : 'Phone'}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={step === 'phone' ? send : verify} className="space-y-5">
            {step === 'phone' ? (
              <label className="cc-label">
                {method === 'email' ? 'Email address' : 'Mobile number'}
                <input
                  autoFocus
                  className="cc-field mt-2"
                  type={method === 'email' ? 'email' : 'tel'}
                  inputMode={method === 'email' ? 'email' : 'tel'}
                  autoComplete={method === 'email' ? 'email' : 'tel'}
                  placeholder={method === 'email' ? 'you@example.com' : '03XX XXXXXXX'}
                  required
                  value={method === 'email' ? email : phone}
                  onChange={(e) =>
                    method === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)
                  }
                  aria-describedby="signin-error"
                />
              </label>
            ) : (
              <label className="cc-label">
                Verification code
                <input
                  autoFocus
                  className="cc-field mt-2 tracking-[.4em] text-center"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  aria-describedby="signin-error"
                />
              </label>
            )}
            {error && (
              <p
                id="signin-error"
                role="alert"
                className="p-3 rounded-lg bg-red-50 text-red-800 text-sm"
              >
                {error}
              </p>
            )}
            {step === 'code' && devCode && (
              <p className="p-3 rounded-lg bg-[#f5efdf] text-[#70501d] text-sm">
                Local preview code: <strong>{devCode}</strong>
              </p>
            )}
            <button
              type="submit"
              disabled={
                busy ||
                (step === 'phone'
                  ? method === 'email'
                    ? !email.trim()
                    : phone.replace(/\D/g, '').length < 10
                  : code.length !== 6)
              }
              className="cc-button w-full disabled:opacity-50"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}{' '}
              {busy ? 'Please wait…' : step === 'phone' ? 'Send my code' : 'Sign in'}
            </button>
          </form>
          {step === 'code' && (
            <div className="flex flex-wrap justify-between gap-3 mt-5 text-sm">
              <button
                className="cc-link"
                disabled={busy}
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
              >
                {method === 'email' ? 'Change email' : 'Change number'}
              </button>
              <button
                disabled={busy || cooldown > 0}
                className="cc-link disabled:text-anjuman-ink-soft disabled:font-normal"
                onClick={() => send()}
              >
                {cooldown > 0 ? 'Resend in ' + cooldown + 's' : 'Resend code'}
              </button>
            </div>
          )}
          <p className="text-xs text-anjuman-ink-soft mt-7 leading-relaxed">
            No password to remember. Already have a phone account? Sign in with it, then add an
            email in Account settings to keep your existing profile.
          </p>
        </section>
      </div>
    </main>
  );
}
