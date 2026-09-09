'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { CITY_OPTIONS, NICHE_OPTIONS, PLATFORM_OPTIONS } from '@/lib/profile-data';
import { z } from 'zod';
const schema = z.object({
  title: z.string(),
  brief: z.string(),
  budgetMin: z.string(),
  budgetMax: z.string(),
  targetNiches: z.array(z.string()),
  targetPlatforms: z.array(z.string()),
  targetCities: z.array(z.string()).default([]),
  timeline: z.string(),
  deliverables: z.array(
    z.object({
      type: z.enum(['post', 'story', 'reel', 'youtube_long', 'youtube_short']),
      qty: z.string(),
    }),
  ),
});
type FormData = z.infer<typeof schema>;
const initial: FormData = {
  title: '',
  brief: '',
  budgetMin: '',
  budgetMax: '',
  targetNiches: [],
  targetPlatforms: [],
  targetCities: [],
  timeline: '',
  deliverables: [{ type: 'post', qty: '1' }],
};
const labels = {
  post: 'Sponsored post',
  story: 'Story',
  reel: 'Short-form reel',
  youtube_long: 'YouTube video',
  youtube_short: 'YouTube Short',
};
export function CampaignForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const key = session?.user?.id ? 'creators-circle:campaign-draft:' + session.user.id : null;
  useEffect(() => {
    if (!key) return;
    try {
      const parsed = schema.safeParse(JSON.parse(sessionStorage.getItem(key) || 'null'));
      if (parsed.success) setData(parsed.data);
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready || !key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [data, ready, key]);
  function toggle(field: 'targetNiches' | 'targetPlatforms' | 'targetCities', v: string) {
    const current = data[field];
    if (field === 'targetNiches' && !current.includes(v) && current.length >= 5) {
      setError('Choose up to five niches.');
      return;
    }
    setData({
      ...data,
      [field]: current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
    });
    setError('');
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!data.targetNiches.length || !data.targetPlatforms.length) {
      setError('Choose at least one niche and one platform.');
      return;
    }
    if (Number(data.budgetMax) < Number(data.budgetMin)) {
      setError('Your maximum budget must be at least your minimum budget.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          budgetMin: Number(data.budgetMin),
          budgetMax: Number(data.budgetMax),
          deliverables: data.deliverables.map((d) => ({ ...d, qty: Number(d.qty) })),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Could not post your campaign. Please try again.');
        return;
      }
      if (key)
        try {
          sessionStorage.removeItem(key);
        } catch {}
      router.push('/brand/campaigns/' + result.id + '?created=1');
      router.refresh();
    } catch {
      setError('Connection lost. Your draft is still here. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cc-container py-9 md:py-12">
      <div className="flex justify-between gap-4 mb-8">
        <Link className="cc-link text-sm inline-flex items-center gap-2" href="/brand/campaigns">
          <ArrowLeft size={15} />
          Campaigns
        </Link>
        <p role="status" className="cc-subtle text-xs">
          {saved ? 'Draft saved in this tab' : 'New campaign'}
        </p>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-10 max-w-5xl mx-auto">
        <div>
          <p className="cc-eyebrow mb-3">Put your idea out there</p>
          <h1 className="cc-title">A clear brief. A great beginning.</h1>
          <p className="cc-subtle mt-3 mb-8">
            Tell creators what you have in mind, what you need, and what it&apos;s worth.
          </p>
          <form onSubmit={submit} className="space-y-6">
            <section className="cc-panel p-5 md:p-7 space-y-5">
              <h2 className="text-xl font-semibold">01 · The idea</h2>
              <label className="cc-label">
                Campaign title
                <input
                  className="cc-field mt-2"
                  required
                  minLength={3}
                  maxLength={120}
                  value={data.title}
                  onChange={(e) => setData({ ...data, title: e.target.value })}
                  placeholder="Give your project a clear, memorable name"
                />
              </label>
              <label className="cc-label">
                The brief
                <textarea
                  className="cc-field mt-2"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={6}
                  value={data.brief}
                  onChange={(e) => setData({ ...data, brief: e.target.value })}
                  placeholder="Your goal, audience, key message, creative direction, and what success looks like."
                />
              </label>
              <p className="text-right cc-subtle text-xs">{data.brief.length}/2,000</p>
            </section>
            <section className="cc-panel p-5 md:p-7 space-y-5">
              <h2 className="text-xl font-semibold">02 · The right people</h2>
              <fieldset>
                <legend className="cc-label">Niches (up to 5)</legend>
                <div className="flex flex-wrap gap-2">
                  {NICHE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={data.targetNiches.includes(n)}
                      onClick={() => toggle('targetNiches', n)}
                      className={
                        'border rounded-full px-3 py-2 text-sm ' +
                        (data.targetNiches.includes(n)
                          ? 'bg-anjuman-purple text-white border-anjuman-purple'
                          : 'border-anjuman-line')
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="cc-label">Platforms</legend>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={data.targetPlatforms.includes(p.id)}
                      onClick={() => toggle('targetPlatforms', p.id)}
                      className={
                        'border rounded-full px-3 py-2 text-sm ' +
                        (data.targetPlatforms.includes(p.id)
                          ? 'bg-anjuman-purple text-white border-anjuman-purple'
                          : 'border-anjuman-line')
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="cc-label">
                  Cities{' '}
                  <span className="font-normal">(optional ? leave empty for all Pakistan)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(CITY_OPTIONS)).map((city) => (
                    <button
                      key={city}
                      type="button"
                      aria-pressed={data.targetCities.includes(city)}
                      onClick={() => toggle('targetCities', city)}
                      className={
                        'border rounded-full px-3 py-2 text-sm ' +
                        (data.targetCities.includes(city)
                          ? 'bg-anjuman-purple text-white border-anjuman-purple'
                          : 'border-anjuman-line')
                      }
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>
            <section className="cc-panel p-5 md:p-7 space-y-5">
              <h2 className="text-xl font-semibold">03 · The details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="cc-label">
                  Minimum budget (PKR)
                  <input
                    className="cc-field mt-2"
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    required
                    value={data.budgetMin}
                    onChange={(e) => setData({ ...data, budgetMin: e.target.value })}
                    placeholder="25,000"
                  />
                </label>
                <label className="cc-label">
                  Maximum budget (PKR)
                  <input
                    className="cc-field mt-2"
                    type="number"
                    min={data.budgetMin || 0}
                    max="2147483647"
                    step="1"
                    required
                    value={data.budgetMax}
                    onChange={(e) => setData({ ...data, budgetMax: e.target.value })}
                    placeholder="50,000"
                  />
                </label>
              </div>
              <div>
                <div className="flex justify-between gap-3 mb-3">
                  <h3 className="cc-label">Deliverables</h3>
                  <button
                    type="button"
                    disabled={data.deliverables.length >= 10}
                    className="cc-link text-sm inline-flex items-center gap-1"
                    onClick={() =>
                      setData({
                        ...data,
                        deliverables: [...data.deliverables, { type: 'post', qty: '1' }],
                      })
                    }
                  >
                    <Plus size={15} />
                    Add
                  </button>
                </div>
                {data.deliverables.map((d, i) => (
                  <div className="flex items-end gap-2 mb-3" key={i}>
                    <label className="text-xs text-anjuman-ink-soft flex-1 min-w-0">
                      Content type
                      <select
                        aria-label={'Deliverable ' + (i + 1) + ' type'}
                        className="cc-field mt-1"
                        value={d.type}
                        onChange={(e) =>
                          setData({
                            ...data,
                            deliverables: data.deliverables.map((v, j) =>
                              i === j ? { ...v, type: e.target.value as keyof typeof labels } : v,
                            ),
                          })
                        }
                      >
                        {Object.entries(labels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-anjuman-ink-soft w-20">
                      Quantity
                      <input
                        aria-label={'Deliverable ' + (i + 1) + ' quantity'}
                        type="number"
                        required
                        min="1"
                        max="20"
                        step="1"
                        className="cc-field mt-1"
                        value={d.qty}
                        onChange={(e) =>
                          setData({
                            ...data,
                            deliverables: data.deliverables.map((v, j) =>
                              i === j ? { ...v, qty: e.target.value } : v,
                            ),
                          })
                        }
                      />
                    </label>
                    {data.deliverables.length > 1 && (
                      <button
                        type="button"
                        className="w-11 h-11 grid place-items-center shrink-0"
                        aria-label={'Remove deliverable ' + (i + 1)}
                        onClick={() =>
                          setData({
                            ...data,
                            deliverables: data.deliverables.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <label className="cc-label">
                Timeline <span className="font-normal text-anjuman-ink-soft">(optional)</span>
                <input
                  className="cc-field mt-2"
                  maxLength={200}
                  value={data.timeline}
                  onChange={(e) => setData({ ...data, timeline: e.target.value })}
                  placeholder="When do you need the work?"
                />
              </label>
            </section>
            {error && (
              <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg text-sm">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="cc-button w-full disabled:opacity-50">
              {busy && <Loader2 size={17} className="animate-spin" />}
              {busy ? 'Publishing…' : 'Publish campaign'}
            </button>
            <p className="cc-subtle text-xs text-center">
              Your brief will be visible to creators accepting opportunities.
            </p>
          </form>
        </div>
        <aside className="hidden lg:block">
          <div className="cc-panel p-6 sticky top-24">
            <p className="cc-eyebrow mb-5">Brief preview</p>
            <h2 className="text-xl font-semibold break-words">
              {data.title || 'Your next campaign'}
            </h2>
            <p className="cc-subtle mt-4 whitespace-pre-wrap break-words">
              {data.brief ||
                'A thoughtful brief helps the right creators picture themselves in your project.'}
            </p>
            <div className="border-t border-anjuman-line pt-4 mt-5">
              <p className="text-xs text-anjuman-ink-soft">Budget</p>
              <p className="text-sm font-semibold mt-1">
                {data.budgetMin || data.budgetMax
                  ? 'PKR ' +
                    (Number(data.budgetMin) || 0).toLocaleString() +
                    ' – ' +
                    (Number(data.budgetMax) || 0).toLocaleString()
                  : 'Add your range'}
              </p>
              <p className="text-xs text-anjuman-ink-soft mt-4">Deliverables</p>
              <p className="text-sm mt-1">
                {data.deliverables.map((d) => d.qty + ' × ' + labels[d.type]).join(', ')}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
