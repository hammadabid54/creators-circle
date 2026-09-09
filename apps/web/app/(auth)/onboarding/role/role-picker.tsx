'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, Building2, ArrowRight, Check, Loader2 } from 'lucide-react';
export function RolePicker() {
  const [role, setRole] = useState<'creator' | 'brand' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { update } = useSession();
  const router = useRouter();
  async function submit() {
    if (!role) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Could not set up your workspace. Please try again.');
      await update();
      router.push('/' + role + '/onboarding');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
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
          {busy ? 'Setting things up…' : 'Continue'}
        </button>
      </div>
    </main>
  );
}
