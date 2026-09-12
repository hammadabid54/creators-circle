'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, Building2, ArrowRight, Check, Loader2, AlertCircle } from 'lucide-react';

const PENDING_ROLE_KEY = 'kollabo:pending-role';

export function RolePicker({
  initialRole,
  pendingSignup,
  existingRole,
}: {
  initialRole?: 'creator' | 'brand';
  /** True when the user reached this page from a public CTA, before signing in. */
  pendingSignup?: boolean;
  /** If the user is already signed in, the role they currently have. */
  existingRole?: 'creator' | 'brand' | null;
}) {
  const [role, setRole] = useState<'creator' | 'brand' | null>(
    initialRole ?? existingRole ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: session, update } = useSession();
  const router = useRouter();

  // The server-rendered existingRole is the source of truth on first paint;
  // once the client session hydrates, the client value is authoritative.
  const currentRole: 'creator' | 'brand' | null =
    session?.user?.role === 'creator' || session?.user?.role === 'brand'
      ? session.user.role
      : existingRole ?? null;

  // If the user landed here from /signin (callbackUrl=/onboarding/role?role=...)
  // and is now signed in, auto-apply the role so they don't have to click again.
  useEffect(() => {
    if (!session?.user?.id) return;
    if (!initialRole) {
      // No initial role from URL — check the localStorage stash (e.g. user
      // picked a role on this page earlier, then signed in from somewhere
      // that didn't carry the param).
      try {
        const stashed = window.localStorage.getItem(PENDING_ROLE_KEY);
        if (stashed === 'creator' || stashed === 'brand') {
          setRole(stashed);
        }
      } catch {}
      return;
    }
    if (session.user.role === 'creator' || session.user.role === 'brand') return;
    void applyRole(initialRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, initialRole]);

  async function applyRole(target: 'creator' | 'brand') {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: target }),
      });
      if (!res.ok) throw new Error('Could not set up your workspace. Please try again.');
      try {
        window.localStorage.removeItem(PENDING_ROLE_KEY);
      } catch {}
      await update();
      router.push('/' + target + '/onboarding');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
      setBusy(false);
    }
  }

  async function submit() {
    if (!role) return;

    // If the user isn't signed in yet, stash the role choice and bounce
    // to /signin with a callback that returns here.
    if (!session?.user?.id || pendingSignup) {
      try {
        window.localStorage.setItem(PENDING_ROLE_KEY, role);
      } catch {}
      router.push(
        '/signin?callbackUrl=' + encodeURIComponent('/onboarding/role?role=' + role),
      );
      return;
    }

    // Already signed in with the same role — just take them to their dashboard.
    if (currentRole && role === currentRole) {
      router.push('/' + role + '/dashboard');
      return;
    }

    await applyRole(role);
  }
  return (
    <main className="cc-container py-12 md:py-20 max-w-4xl">
      <p className="cc-eyebrow text-center mb-4">There&apos;s room for you here</p>
      <h1 className="cc-title text-center">What brings you to the circle?</h1>
      <p className="cc-subtle text-center mt-4 mb-10">
        Choose the workspace that fits what you want to do. Each account uses one role; you cannot switch roles after choosing.
      </p>
      <div className="grid md:grid-cols-2 gap-5">
        {[
          {
            id: 'creator' as const,
            title: 'I bring the creative perspective.',
            body: 'Build a profile, share your work, and find brand collaborations.',
            Icon: Camera,
          },
          {
            id: 'brand' as const,
            title: 'I’m looking for the right talent.',
            body: 'Discover creators, post campaign briefs, and review proposals.',
            Icon: Building2,
          },
        ].map(({ id, title, body, Icon }) => (
          <button
            type="button"
            key={id}
            aria-pressed={role === id}
            onClick={() => setRole(id)}
            className={
              'cc-panel text-left p-7 border-2 transition-colors ' +
              (role === id ? 'border-anjuman-purple bg-[#f5eff3]' : 'hover:border-[#baa3b2]')
            }
          >
            <div className="flex justify-between items-center mb-8">
              <Icon size={30} className="text-anjuman-purple" strokeWidth={1.3} />
              {role === id && <Check size={20} className="text-anjuman-purple" />}
            </div>
            <h2 className="text-xl font-semibold mb-3">{title}</h2>
            <p className="cc-subtle">{body}</p>
          </button>
        ))}
      </div>

      {currentRole && (
        <div
          role="status"
          className="mt-6 mx-auto max-w-2xl cc-panel p-4 md:p-5 border border-anjuman-line bg-[#faf8f5] flex items-start gap-3"
        >
          <AlertCircle size={18} className="text-anjuman-purple shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-anjuman-ink">
              You&rsquo;re signed in as a <b className="font-semibold capitalize">{currentRole}</b>.{' '}
              {role && role !== currentRole
                ? 'To switch to the other side, sign out and create a new account.'
                : 'Picking the same role will take you back to your dashboard.'}
            </p>
            {(!role || role === currentRole) && (
              <button
                type="button"
                onClick={() => router.push('/' + currentRole + '/dashboard')}
                className="cc-link text-sm mt-2 inline-block"
              >
                Go to your {currentRole} dashboard →
              </button>
            )}
            {role && role !== currentRole && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/onboarding/role' })}
                className="cc-link text-sm mt-2 inline-block"
              >
                Sign out to continue as a {role} →
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-800 text-sm mt-5">
          {error}
        </p>
      )}
      <div className="flex justify-center mt-8">
        <button
          className="cc-button disabled:opacity-50 min-w-48"
          disabled={!role || busy}
          onClick={submit}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{' '}
          {busy
            ? 'Setting things up…'
            : pendingSignup && !session?.user
              ? 'Continue & sign in'
              : currentRole
                ? `Continue as a ${role}`
                : 'Continue'}
        </button>
      </div>
    </main>
  );
}
