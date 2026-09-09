'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X } from 'lucide-react';
import { z } from 'zod';
import { Avatar } from '@/components/ui/avatar';
import { PLATFORM_OPTIONS } from '@/lib/profile-data';
const draftSchema = z.object({
  name: z.string(),
  bio: z.string(),
  city: z.string(),
  niches: z.array(z.string()),
  languages: z.array(z.string()),
  image: z.string(),
  available: z.boolean(),
  portfolio: z.array(
    z.object({ type: z.enum(['image', 'video', 'link']), url: z.string(), caption: z.string() }),
  ),
  rateCard: z.object({
    postRate: z.string(),
    storyRate: z.string(),
    reelRate: z.string(),
    youtubeLongRate: z.string(),
    youtubeShortRate: z.string(),
  }),
});
type FormData = z.infer<typeof draftSchema>;
interface Initial extends FormData {
  socialAccounts: Record<string, { enabled: boolean; handle: string; followers: string }>;
}
const steps = ['Introduction', 'Platforms', 'Your interests', 'Services & work'];
const rateLabels = {
  postRate: 'Sponsored post',
  storyRate: 'Story',
  reelRate: 'Short-form reel',
  youtubeLongRate: 'YouTube video',
  youtubeShortRate: 'YouTube Short',
};
export function CreatorOnboardingWizard({
  initial,
  userId,
  taxonomy,
}: {
  initial: Initial;
  userId: string;
  taxonomy: { kind: string; value: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<FormData>(initial);
  const [step, setStep] = useState(params.has('connected') || params.has('error') ? 1 : 0);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [socials, setSocials] = useState(initial.socialAccounts);
  const editing = initial.niches.length > 0;
  const key = 'creators-circle:profile-draft:' + userId;
  useEffect(() => {
    try {
      const result = draftSchema.safeParse(JSON.parse(sessionStorage.getItem(key) || 'null'));
      if (result.success) setData(result.data);
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [data, key, ready]);
  function change<K extends keyof FormData>(field: K, value: FormData[K]) {
    setData((d) => ({ ...d, [field]: value }));
    setError('');
  }
  function toggle(field: 'niches' | 'languages', value: string) {
    const list = data[field];
    if (!list.includes(value) && list.length >= 5) {
      setError('Choose up to five ' + field + '.');
      return;
    }
    change(field, list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }
  function advance() {
    if (step === 0 && data.name.trim().length < 2) {
      setError('Add a display name with at least two characters.');
      return;
    }
    if (step === 2 && (!data.niches.length || !data.languages.length || !data.city)) {
      setError('Choose at least one niche, one language, and your city.');
      return;
    }
    setError('');
    setStep(step + 1);
  }
  async function disconnect(platform: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/social/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error('Could not disconnect. Please try again.');
      const pair = ['instagram', 'facebook'].includes(platform)
        ? ['instagram', 'facebook']
        : [platform];
      setSocials((s) => ({
        ...s,
        ...Object.fromEntries(pair.map((p) => [p, { enabled: false, handle: '', followers: '' }])),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection error.');
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setError('');
    if (
      data.name.trim().length < 2 ||
      !data.city ||
      !data.niches.length ||
      !data.languages.length
    ) {
      setError('Add your name, city, at least one niche, and one language before saving.');
      return;
    }
    const rateCard = Object.fromEntries(
      Object.entries(data.rateCard).map(([k, v]) => [k, v.trim() === '' ? null : Number(v)]),
    );
    if (
      Object.values(rateCard).some(
        (v) => v !== null && (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)),
      )
    ) {
      setError('Rates must be whole PKR amounts, zero or greater.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/onboarding/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          rateCard,
          portfolio: data.portfolio.filter((p) => p.url.trim()),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Could not save. Check your details and try again.');
        return;
      }
      try {
        sessionStorage.removeItem(key);
      } catch {}
      router.push('/creator/dashboard?updated=1');
      router.refresh();
    } catch {
      setError('Connection lost. Your edits are still here. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cc-container py-9 md:py-12">
      <div className="flex items-center justify-between gap-4 mb-8">
        <a href="/creator/dashboard" className="cc-link text-sm inline-flex gap-2 items-center">
          <ArrowLeft size={15} />
          Workspace
        </a>
        <p role="status" className="text-xs text-anjuman-ink-soft">
          {saved ? 'Draft saved in this tab' : 'Your profile'}
        </p>
      </div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-10 max-w-5xl mx-auto">
        <div className="min-w-0">
          <p className="cc-eyebrow mb-3">{editing ? 'Make it yours' : 'Welcome to your circle'}</p>
          <h1 className="cc-title">
            {editing ? 'Your profile, your perspective.' : 'Let your work open doors.'}
          </h1>
          <p className="cc-subtle mt-3 mb-7">
            {editing
              ? 'Choose a section to update. Your public profile changes when you save.'
              : 'Start with your name, city, at least one niche and one language. Photos, platforms, rates and work samples can be added later.'}
          </p>
          <nav
            aria-label="Profile setup sections"
            className="grid grid-cols-4 border-b border-anjuman-line mb-7"
          >
            {steps.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-current={step === i ? 'step' : undefined}
                onClick={() => {
                  if (editing || i < step) {
                    setStep(i);
                    setError('');
                  }
                }}
                disabled={!editing && i > step}
                className={
                  'text-left pb-4 pr-2 border-b-2 text-xs leading-relaxed ' +
                  (step === i
                    ? 'border-anjuman-purple text-anjuman-purple font-semibold'
                    : 'border-transparent text-anjuman-ink-soft disabled:opacity-50')
                }
              >
                <span className="block mb-1">0{i + 1}</span>
                {s}
              </button>
            ))}
          </nav>
          <section aria-label={steps[step]} className="cc-panel p-5 md:p-7 space-y-5">
            {step === 0 && (
              <>
                <label className="cc-label">
                  Display name
                  <input
                    className="cc-field mt-2"
                    value={data.name}
                    maxLength={100}
                    onChange={(e) => change('name', e.target.value)}
                    autoComplete="name"
                    placeholder="How should brands know you?"
                  />
                </label>
                <label className="cc-label">
                  Your introduction{' '}
                  <span className="font-normal text-anjuman-ink-soft">(optional)</span>
                  <textarea
                    className="cc-field mt-2"
                    rows={4}
                    maxLength={500}
                    value={data.bio}
                    onChange={(e) => change('bio', e.target.value)}
                    placeholder="Your perspective, what you create, and what makes your work yours."
                  />
                </label>
                <p className="text-xs text-anjuman-ink-soft text-right">{data.bio.length}/500</p>
                <label className="cc-label">
                  Profile photo URL{' '}
                  <span className="font-normal text-anjuman-ink-soft">(optional)</span>
                  <input
                    className="cc-field mt-2"
                    type="url"
                    value={data.image}
                    onChange={(e) => change('image', e.target.value)}
                    placeholder="https://…"
                  />
                </label>
                <p className="cc-subtle text-xs">
                  Use a publicly accessible photo you own or have permission to use.
                </p>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    className="accent-[#582d46] w-4 h-4"
                    type="checkbox"
                    checked={data.available}
                    onChange={(e) => change('available', e.target.checked)}
                  />
                  Open to new collaborations
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold">Where do you create?</h2>
                <p className="cc-subtle">
                  Add a platform so brands can discover your profile. You can finish this later.
                </p>
                {params.has('connected') && (
                  <p role="status" className="p-3 bg-[#edf5ef] text-[#285b3f] text-sm rounded-lg">
                    Account added{params.get('mock') === '1' ? ' with demonstration data' : ''}.
                  </p>
                )}
                {params.has('error') && (
                  <p role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-lg">
                    The connection could not be completed. Please try again.
                  </p>
                )}
                {PLATFORM_OPTIONS.map((p) => (
                  <div
                    key={p.id}
                    className="border-b border-anjuman-line py-4 flex flex-wrap justify-between gap-3 items-center"
                  >
                    <div>
                      <h3 className="font-semibold text-sm">{p.label}</h3>
                      <p className="cc-subtle text-xs">
                        {socials[p.id]?.enabled ? '@' + socials[p.id]?.handle : 'Not added yet'}
                      </p>
                    </div>
                    {socials[p.id]?.enabled ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="cc-button cc-button-secondary"
                        onClick={() => disconnect(p.id)}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <a
                        className="cc-button cc-button-secondary"
                        href={p.oauthPath + '?returnTo=/creator/onboarding'}
                        onClick={() => {
                          try {
                            sessionStorage.setItem(key, JSON.stringify(data));
                          } catch {}
                        }}
                      >
                        Connect {p.label}
                      </a>
                    )}
                  </div>
                ))}
              </>
            )}
            {step === 2 && (
              <>
                <fieldset>
                  <legend className="cc-label">
                    Your niches{' '}
                    <span className="font-normal text-anjuman-ink-soft">(choose up to 5)</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {taxonomy
                      .filter((t) => t.kind === 'niche')
                      .map(({ value: n }) => (
                        <button
                          type="button"
                          key={n}
                          aria-pressed={data.niches.includes(n)}
                          onClick={() => toggle('niches', n)}
                          className={
                            'border rounded-full px-3 py-2 text-sm ' +
                            (data.niches.includes(n)
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
                  <legend className="cc-label">Languages you create in</legend>
                  <div className="flex flex-wrap gap-2">
                    {taxonomy
                      .filter((t) => t.kind === 'language')
                      .map((l) => (
                        <button
                          type="button"
                          key={l.value}
                          aria-pressed={data.languages.includes(l.value)}
                          onClick={() => toggle('languages', l.value)}
                          className={
                            'border rounded-full px-3 py-2 text-sm ' +
                            (data.languages.includes(l.value)
                              ? 'bg-anjuman-purple text-white border-anjuman-purple'
                              : 'border-anjuman-line')
                          }
                        >
                          {l.label}
                        </button>
                      ))}
                  </div>
                </fieldset>
                <label className="cc-label">
                  Your city
                  <select
                    className="cc-field mt-2"
                    value={data.city}
                    onChange={(e) => change('city', e.target.value)}
                  >
                    <option value="">Select your city</option>
                    {taxonomy
                      .filter((t) => t.kind === 'city')
                      .map(({ value: c }) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="text-xl font-semibold">Set the starting point.</h2>
                <p className="cc-subtle">
                  Add rates for the services you offer. Leave others blank. All prices are in PKR.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(rateLabels).map(([key, label]) => (
                    <label key={key} className="text-sm font-medium">
                      {label}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="cc-field mt-2"
                        placeholder="Not listed"
                        value={data.rateCard[key as keyof typeof rateLabels]}
                        onChange={(e) =>
                          change('rateCard', { ...data.rateCard, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="border-t border-anjuman-line pt-6">
                  <div className="flex justify-between gap-3 mb-3">
                    <h2 className="text-xl font-semibold">Selected work</h2>
                    <button
                      type="button"
                      className="cc-link text-sm inline-flex items-center gap-1"
                      disabled={data.portfolio.length >= 6}
                      onClick={() =>
                        change('portfolio', [
                          ...data.portfolio,
                          { type: 'image', url: '', caption: '' },
                        ])
                      }
                    >
                      <Plus size={16} />
                      Add work
                    </button>
                  </div>
                  <p className="cc-subtle mb-5">
                    Share up to six publicly accessible examples you have permission to show.
                  </p>
                  {data.portfolio.map((p, i) => (
                    <div
                      key={i}
                      className="border border-anjuman-line rounded-lg p-4 space-y-3 mt-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm">
                          Type
                          <select
                            className="cc-field mt-1"
                            value={p.type}
                            onChange={(e) =>
                              change(
                                'portfolio',
                                data.portfolio.map((v, j) =>
                                  j === i
                                    ? { ...v, type: e.target.value as 'image' | 'video' | 'link' }
                                    : v,
                                ),
                              )
                            }
                          >
                            <option value="image">Image</option>
                            <option value="video">Video link</option>
                            <option value="link">Project link</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          aria-label={'Remove work sample ' + (i + 1)}
                          className="w-11 h-11 grid place-items-center"
                          onClick={() =>
                            change(
                              'portfolio',
                              data.portfolio.filter((_, j) => i !== j),
                            )
                          }
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <label className="block text-sm">
                        Public URL
                        <input
                          type="url"
                          className="cc-field mt-1"
                          value={p.url}
                          onChange={(e) =>
                            change(
                              'portfolio',
                              data.portfolio.map((v, j) =>
                                j === i ? { ...v, url: e.target.value } : v,
                              ),
                            )
                          }
                          placeholder="https://…"
                        />
                      </label>
                      <label className="block text-sm">
                        Caption
                        <input
                          className="cc-field mt-1"
                          maxLength={200}
                          value={p.caption}
                          onChange={(e) =>
                            change(
                              'portfolio',
                              data.portfolio.map((v, j) =>
                                j === i ? { ...v, caption: e.target.value } : v,
                              ),
                            )
                          }
                          placeholder="Tell us about this work"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
          {error && (
            <p role="alert" className="p-4 mt-4 text-sm rounded-lg bg-red-50 text-red-800">
              {error}
            </p>
          )}
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              className="cc-button cc-button-secondary disabled:opacity-40"
              disabled={step === 0 || busy}
              onClick={() => {
                setStep(step - 1);
                setError('');
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            {editing || step === 3 ? (
              <button className="cc-button disabled:opacity-50" disabled={busy} onClick={submit}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{' '}
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            ) : (
              <button className="cc-button" onClick={advance}>
                Continue
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="cc-panel p-6 sticky top-24">
            <p className="cc-eyebrow mb-6">Profile preview</p>
            <Avatar name={data.name || 'Your name'} src={data.image || undefined} size="xl" />
            <h2 className="text-xl font-semibold mt-4">{data.name || 'Your name'}</h2>
            <p className="cc-subtle mt-1">
              {data.city || 'Your city'} · {data.available ? 'Open to work' : 'Unavailable'}
            </p>
            <p className="cc-subtle mt-5 whitespace-pre-wrap break-words">
              {data.bio || 'Your story belongs here. Tell brands what you love to create.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {data.niches.map((n) => (
                <span className="text-xs bg-anjuman-line-soft rounded px-2 py-1" key={n}>
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
