'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { NICHE_OPTIONS, CITY_OPTIONS, INDUSTRY_OPTIONS, BUDGET_TIERS } from '@/lib/profile-data';
import { Breadcrumb } from '@/components/ui/breadcrumb';
interface Initial {
  company: string;
  industry: string;
  ntn: string;
  website: string;
  city: string;
  monthlyBudget: string;
  preferredNiches: string[];
}
export function BrandOnboardingForm({ initial }: { initial: Initial }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          industry: data.industry || undefined,
          city: data.city || undefined,
          ntn: data.ntn || undefined,
          monthlyBudget: data.monthlyBudget || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Please check the details and try again.');
        return;
      }
      router.push('/brand/dashboard?updated=1');
      router.refresh();
    } catch {
      setError('Connection lost. Your edits are still here. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cc-container py-9 md:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Workspace', href: '/brand/dashboard' },
          { label: 'Brand profile' },
        ]}
      />
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_300px] gap-10 mt-6">
        <div>
          <p className="cc-eyebrow mb-3">Introduce your brand</p>
          <h1 className="cc-title">Good work starts with context.</h1>
          <p className="cc-subtle mt-3 mb-8">
            Company name is required. Add optional details to help creators understand your business.
          </p>
          <form onSubmit={submit} className="cc-panel p-5 md:p-7 space-y-6">
            <label className="cc-label">
              Company name
              <input
                required
                maxLength={100}
                className="cc-field mt-2"
                value={data.company}
                onChange={(e) => setData({ ...data, company: e.target.value })}
                placeholder="Your brand or agency"
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="cc-label">
                Industry <span className="font-normal text-anjuman-ink-soft">(optional)</span>
                <select
                  className="cc-field mt-2"
                  value={data.industry}
                  onChange={(e) => setData({ ...data, industry: e.target.value })}
                >
                  <option value="">Choose an industry</option>
                  {INDUSTRY_OPTIONS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="cc-label">
                City <span className="font-normal text-anjuman-ink-soft">(optional)</span>
                <select
                  className="cc-field mt-2"
                  value={data.city}
                  onChange={(e) => setData({ ...data, city: e.target.value })}
                >
                  <option value="">Choose a city</option>
                  {Array.from(new Set(CITY_OPTIONS)).map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="cc-label">
              Website <span className="font-normal text-anjuman-ink-soft">(optional)</span>
              <input
                type="url"
                className="cc-field mt-2"
                value={data.website}
                onChange={(e) => setData({ ...data, website: e.target.value })}
                placeholder="https://yourbrand.com"
              />
            </label>
            <details className="border-y border-anjuman-line py-4">
              <summary className="text-sm font-medium">Business details (optional)</summary>
              <label className="cc-label mt-4">
                National Tax Number
                <input
                  className="cc-field mt-2"
                  maxLength={20}
                  value={data.ntn}
                  onChange={(e) => setData({ ...data, ntn: e.target.value })}
                />
              </label>
            </details>
            <fieldset>
              <legend className="cc-label">
                Monthly creator budget{' '}
                <span className="font-normal text-anjuman-ink-soft">(optional)</span>
              </legend>
              <p className="cc-subtle mb-4">A general range, not a commitment.</p>
              <div className="space-y-2">
                {BUDGET_TIERS.map((b) => (
                  <label
                    key={b.value}
                    className={
                      'flex gap-3 items-center p-4 border rounded-lg text-sm ' +
                      (data.monthlyBudget === b.value
                        ? 'border-anjuman-purple bg-[#f5eff3]'
                        : 'border-anjuman-line')
                    }
                  >
                    <input
                      type="radio"
                      name="budget"
                      value={b.value}
                      checked={data.monthlyBudget === b.value}
                      onChange={(e) => setData({ ...data, monthlyBudget: e.target.value })}
                      className="accent-[#582d46]"
                    />
                    {b.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="cc-label">What kind of creators interest you?</legend>
              <div className="flex flex-wrap gap-2">
                {NICHE_OPTIONS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    aria-pressed={data.preferredNiches.includes(n)}
                    onClick={() =>
                      setData({
                        ...data,
                        preferredNiches: data.preferredNiches.includes(n)
                          ? data.preferredNiches.filter((v) => v !== n)
                          : [...data.preferredNiches, n],
                      })
                    }
                    className={
                      'border rounded-full px-3 py-2 text-sm ' +
                      (data.preferredNiches.includes(n)
                        ? 'bg-anjuman-purple text-white border-anjuman-purple'
                        : 'border-anjuman-line')
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm p-3 bg-red-50 text-red-800 rounded-lg">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !data.company.trim()}
              className="cc-button w-full disabled:opacity-50"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}{' '}
              {busy ? 'Saving…' : 'Save brand profile'}
            </button>
          </form>
        </div>
        <aside className="hidden lg:block">
          <div className="cc-panel p-6 sticky top-24">
            <p className="cc-eyebrow mb-5">Your brand, at a glance</p>
            <h2 className="text-2xl font-semibold break-words">{data.company || 'Your company'}</h2>
            <p className="cc-subtle mt-3">
              {[data.industry, data.city].filter(Boolean).join(' · ') ||
                'Add a little context for your future collaborators.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {data.preferredNiches.map((n) => (
                <span key={n} className="text-xs px-2 py-1 bg-anjuman-line-soft rounded">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
