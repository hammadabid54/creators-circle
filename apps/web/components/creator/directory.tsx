'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Check, Columns2, Search, SlidersHorizontal, X } from 'lucide-react';
import { CreatorCard, type CreatorCardData } from './creator-card';
import type { Taxon } from '@/lib/discovery-taxonomy';
import { formatPKRCompact, formatNumber } from '@/lib/utils';
const SAVED_KEY = 'creators-circle:saved';
const aliases: Record<string, string> = {
  lifestyle: 'Lifestyle',
  fashion: 'Fashion',
  health: 'Health & Wellness',
  fitness: 'Fitness',
  food: 'Food & Cooking',
  travel: 'Travel',
  beauty: 'Beauty & Makeup',
  tech: 'Tech & Gadgets',
  parenting: 'Parenting',
  education: 'Education',
  finance: 'Personal Finance',
  comedy: 'Comedy',
};
export function CreatorDirectory({
  creators,
  total,
  page,
  pages,
  taxa,
  facets,
}: {
  creators: CreatorCardData[];
  total: number;
  page: number;
  pages: number;
  taxa: Taxon[];
  facets: Record<string, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string[]>([]);
  const [savedReady, setSavedReady] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparisonCards, setComparisonCards] = useState<CreatorCardData[]>([]);
  const [notice, setNotice] = useState('');
  const filters = useRef<HTMLDialogElement>(null);
  const compare = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      if (Array.isArray(data)) setSaved(data.filter((x): x is string => typeof x === 'string'));
    } catch {}
    setSavedReady(true);
  }, []);
  const q = params.get('q') || '';
  const nicheRaw = params.get('niche') || '';
  const niche = aliases[nicheRaw] || nicheRaw;
  const city = params.get('city') || '';
  const platform = params.get('platform') || '';
  const language = params.get('language') || '';
  const followers = params.get('followers') || '';
  const rate = params.get('rate') || '';
  const sort = params.get('sort') || 'recommended';
  const savedOnly = params.get('saved') === '1';
  useEffect(() => {
    if (savedReady && savedOnly) {
      const ids = saved.slice(0, 200).join(',');
      if (ids !== (params.get('ids') || '')) {
        const next = new URLSearchParams(params);
        next.set('ids', ids);
        next.delete('page');
        router.replace('/creators?' + next.toString(), { scroll: false });
      }
    }
  }, [savedReady, savedOnly, saved, params, router]);
  function navigate(next: URLSearchParams) {
    next.delete('page');
    if (next.get('saved') === '1') next.set('ids', saved.slice(0, 200).join(','));
    else next.delete('ids');
    startTransition(() =>
      router.push('/creators' + (next.size ? '?' + next.toString() : ''), { scroll: false }),
    );
  }
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    navigate(next);
  }
  function submitFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (e.currentTarget.elements.namedItem('available')) next.delete('available');
    new FormData(e.currentTarget).forEach((value, key) => {
      if (value) next.set(key, String(value));
      else next.delete(key);
    });
    navigate(next);
    filters.current?.close();
  }
  function toggleSave(id: string) {
    if (!saved.includes(id) && saved.length >= 200) {
      setNotice('Your browser shortlist holds up to 200 creators. Remove one to add another.');
      return;
    }
    const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setNotice(next.includes(id) ? 'Creator saved.' : 'Creator removed from saved.');
    } catch {
      setNotice('Saved for this visit. Browser storage is unavailable.');
    }
  }
  function toggleCompare(id: string) {
    if (selected.includes(id)) setSelected(selected.filter((s) => s !== id));
    else if (selected.length < 3) {
      setSelected([...selected, id]);
      const card = creators.find((c) => c.id === id);
      if (card) setComparisonCards((previous) => [...previous.filter((c) => c.id !== id), card]);
    } else setNotice('Compare up to three creators. Remove one to add another.');
  }
  const candidates = creators;
  const active = Array.from(params.entries()).filter(
    ([k, v]) => v && !['sort', 'saved', 'ids', 'page'].includes(k),
  );
  function filterFields() {
    return (
      <>
        <label className="text-sm">
          Niche
          <select name="niche" defaultValue={niche} className="cc-field mt-2">
            <option value="">All niches</option>
            {taxa
              .filter((t) => t.kind === 'niche')
              .map(({ id, value: n, label }) => (
                <option key={n} value={n}>
                  {label} ({facets[id] || 0})
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Platform
          <select name="platform" defaultValue={platform} className="cc-field mt-2">
            <option value="">All platforms</option>
            {['instagram', 'youtube', 'tiktok', 'facebook'].map((n) => (
              <option value={n} key={n}>
                {n.charAt(0).toUpperCase() + n.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          City
          <select name="city" defaultValue={city} className="cc-field mt-2">
            <option value="">All Pakistan</option>
            {taxa
              .filter((t) => t.kind === 'city')
              .map(({ id, value: n, label }) => (
                <option key={n} value={n}>
                  {label} ({facets[id] || 0})
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Language
          <select name="language" defaultValue={language} className="cc-field mt-2">
            <option value="">Any language</option>
            {taxa
              .filter((t) => t.kind === 'language')
              .map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label} ({facets[n.id] || 0})
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Followers
          <select name="followers" defaultValue={followers} className="cc-field mt-2">
            <option value="">Any audience size</option>
            {['0-10K', '10K-100K', '100K-500K', '500K-1M', '1M+'].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Starting rate
          <select name="rate" defaultValue={rate} className="cc-field mt-2">
            <option value="">Any budget</option>
            <option value="25000">Up to PKR 25,000</option>
            <option value="50000">Up to PKR 50,000</option>
            <option value="100000">Up to PKR 100,000</option>
            {rate && !['25000', '50000', '100000'].includes(rate) && (
              <option value={rate}>Up to PKR {Number(rate).toLocaleString('en-PK')}</option>
            )}
          </select>
        </label>
        <label className="text-sm">
          Deliverable
          <select name="format" defaultValue={params.get('format') || ''} className="cc-field mt-2">
            <option value="">Any format</option>
            {taxa
              .filter((t) => t.kind === 'format')
              .map((t) => (
                <option key={t.id} value={t.value}>
                  {t.label}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            name="available"
            value="1"
            defaultChecked={params.get('available') === '1'}
          />
          Open to collaborations
        </label>
      </>
    );
  }
  const compared = selected
    .map((id) => comparisonCards.find((c) => c.id === id))
    .filter((c): c is CreatorCardData => !!c);
  return (
    <section aria-label="Creator directory">
      <datalist id="creator-query-suggestions">
        {taxa
          .filter((t) => t.kind === 'niche' || t.kind === 'city')
          .map((t) => (
            <option key={t.id} value={t.label} />
          ))}
      </datalist>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <form
          key={q}
          onSubmit={submitFilters}
          role="search"
          className="flex flex-1 min-w-[220px] max-w-xl items-center gap-2 bg-white border border-anjuman-line rounded-lg pl-3"
        >
          <Search size={18} className="text-anjuman-ink-soft" />
          <input
            name="q"
            defaultValue={q}
            aria-label="Search creators"
            placeholder="Try Urdu food creators in Lahore under PKR 50,000"
            list="creator-query-suggestions"
            className="w-full min-w-0 bg-transparent py-3 text-sm outline-none"
          />
          <button type="submit" className="cc-button m-1">
            Search
          </button>
        </form>
        <button
          onClick={() => setParam('saved', savedOnly ? '' : '1')}
          aria-pressed={savedOnly}
          className="cc-button cc-button-secondary"
        >
          <Bookmark size={16} fill={savedOnly ? 'currentColor' : 'none'} />
          Saved ({saved.length})
        </button>
        <button
          onClick={() => filters.current?.showModal()}
          className="cc-button cc-button-secondary lg:hidden"
        >
          <SlidersHorizontal size={16} />
          Filters{active.length > 0 ? ' (' + active.length + ')' : ''}
        </button>
      </div>
      <form
        key={params.toString()}
        onSubmit={submitFilters}
        className="hidden lg:grid grid-cols-3 xl:grid-cols-7 gap-3 cc-panel p-4 items-end mb-5"
      >
        {filterFields()}
        <button type="submit" className="cc-button">
          Apply filters
        </button>
      </form>
      <dialog
        ref={filters}
        aria-labelledby="filter-title"
        className="fixed m-0 ml-auto h-dvh max-h-none w-[min(420px,100%)] max-w-none p-6 bg-anjuman-bg border-l border-anjuman-line backdrop:bg-[#211720]/40"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="filter-title" className="text-xl font-semibold">
            Refine your circle
          </h2>
          <button
            onClick={() => filters.current?.close()}
            className="w-11 h-11 grid place-items-center"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>
        <form key={params.toString()} onSubmit={submitFilters} className="grid gap-5">
          {filterFields()}
          <button type="submit" className="cc-button mt-3">
            Show creators
          </button>
        </form>
      </dialog>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {active.map(([k, v]) => (
            <button
              key={k}
              onClick={() => setParam(k, '')}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#ede4e9] text-anjuman-purple rounded-full text-xs"
              aria-label={'Remove ' + k + ' filter'}
            >
              {k === 'niche' ? aliases[v] || v : v}
              <X size={12} />
            </button>
          ))}
          <button
            className="cc-link text-xs py-2 px-2"
            onClick={() => navigate(new URLSearchParams(savedOnly ? 'saved=1' : ''))}
          >
            Clear all
          </button>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3 items-center mb-6">
        <p className="text-sm text-anjuman-ink-soft" aria-live="polite">
          <strong className="text-anjuman-ink">{total}</strong> {savedOnly ? 'saved ' : ''}creator
          {total === 1 ? '' : 's'}
          {pending ? ' · Updating…' : ''}
        </p>
        <label className="flex gap-2 items-center text-sm text-anjuman-ink-soft">
          Sort by
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="bg-transparent font-medium text-anjuman-ink py-2"
          >
            <option value="recommended">Recommended</option>
            <option value="newest">Recently joined</option>
            <option value="followers">Most followers</option>
            <option value="rate">Lowest starting rate</option>
            <option value="engagement">Highest engagement</option>
          </select>
        </label>
      </div>
      {savedOnly && <p className="cc-subtle mb-5">Your shortlist is saved in this browser.</p>}
      {sort === 'recommended' && (
        <details className="cc-panel p-4 mb-5 text-sm">
          <summary className="cursor-pointer font-medium">How recommendations work</summary>
          <p className="cc-subtle mt-3">
            Your filters come first. Matching names and handles rank ahead of biography-only
            matches. We then consider profile completeness, availability, recent connected
            statistics, and approved work with distinct brands.
          </p>
          <p className="cc-subtle mt-2">
            Follower totals and low prices do not buy a higher position. Engagement is compared
            within each platform only when at least 20 recently measured accounts qualify. Missing
            metrics receive a neutral value, and new creators start with a baseline for work
            history. This is a discovery aid, not a quality guarantee.
          </p>
        </details>
      )}
      <p role="status" className="sr-only">
        {notice}
      </p>
      <div aria-busy={pending} className={pending ? 'opacity-60 transition-opacity' : ''}>
        {candidates.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {candidates.map((c) => (
              <CreatorCard
                key={c.id}
                creator={c}
                actions={
                  <div className="flex justify-between gap-3 text-sm">
                    <button
                      className="inline-flex items-center gap-2 py-1.5 text-anjuman-purple"
                      aria-label={(saved.includes(c.id) ? 'Unsave ' : 'Save ') + c.name}
                      aria-pressed={saved.includes(c.id)}
                      onClick={() => toggleSave(c.id)}
                    >
                      <Bookmark size={16} fill={saved.includes(c.id) ? 'currentColor' : 'none'} />
                      {saved.includes(c.id) ? 'Saved' : 'Save'}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 py-1.5 text-anjuman-ink-soft"
                      aria-label={'Compare ' + c.name}
                      aria-pressed={selected.includes(c.id)}
                      onClick={() => toggleCompare(c.id)}
                    >
                      {selected.includes(c.id) ? <Check size={16} /> : <Columns2 size={16} />}
                      Compare
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <div className="cc-panel text-center px-6 py-16">
            <Search size={30} className="mx-auto mb-5 text-anjuman-purple" strokeWidth={1.3} />
            <h2 className="text-2xl font-semibold">
              {savedOnly ? 'Your shortlist starts here.' : 'A little more room to explore.'}
            </h2>
            <p className="cc-subtle mt-3 mb-6">
              {savedOnly
                ? 'Save creators you like and find them here.'
                : 'No creators match these filters. Try a different niche or a wider budget.'}
            </p>
            <button
              className="cc-button cc-button-secondary"
              onClick={() => navigate(new URLSearchParams())}
            >
              Explore all creators
            </button>
          </div>
        )}
      </div>
      {pages > 1 && (
        <nav
          aria-label="Creator result pages"
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
        >
          {page > 1 && (
            <Link
              className="cc-button-secondary"
              href={
                '/creators?' +
                (() => {
                  const p = new URLSearchParams(params);
                  p.set('page', String(page - 1));
                  return p.toString();
                })()
              }
            >
              Previous
            </Link>
          )}
          <span className="cc-subtle text-sm">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              className="cc-button-secondary"
              href={
                '/creators?' +
                (() => {
                  const p = new URLSearchParams(params);
                  p.set('page', String(page + 1));
                  return p.toString();
                })()
              }
            >
              Next
            </Link>
          )}
        </nav>
      )}
      {selected.length > 0 && (
        <div className="sticky bottom-4 mt-8 bg-[#392333] text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg z-20">
          <div>
            <p className="font-medium text-sm">{selected.length} of 3 creators selected</p>
            <p className="text-xs text-[#dfc5d4] mt-1">
              Compare rates, audience, and availability.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => setSelected([])} className="text-sm p-2">
              Clear
            </button>
            <button
              disabled={selected.length < 2}
              onClick={() => compare.current?.showModal()}
              className="cc-button bg-white text-[#392333] hover:bg-[#f0e6ec] disabled:opacity-50"
            >
              Compare{selected.length < 2 ? ' (select 2+)' : ''}
            </button>
          </div>
        </div>
      )}
      <dialog
        ref={compare}
        aria-labelledby="compare-title"
        className="m-auto w-[min(960px,calc(100%-32px))] max-w-[calc(100%-32px)] max-h-[90dvh] rounded-xl p-5 md:p-8 backdrop:bg-[#211720]/50 bg-white"
      >
        <div className="flex justify-between gap-5 items-center mb-6">
          <h2 id="compare-title" className="text-2xl font-semibold">
            Find your fit.
          </h2>
          <button
            onClick={() => compare.current?.close()}
            className="w-11 h-11 grid place-items-center"
            aria-label="Close comparison"
          >
            <X />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[560px]">
            <caption className="sr-only">Creator comparison</caption>
            <thead>
              <tr>
                <th className="p-3">Details</th>
                {compared.map((c) => (
                  <th className="p-3" key={c.id}>
                    <Link className="cc-link" href={'/creators/' + c.id}>
                      {c.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Niches', (c: CreatorCardData) => c.niches.join(', ') || 'Not added'],
                ['Location', (c: CreatorCardData) => c.city],
                [
                  'Starting rate',
                  (c: CreatorCardData) =>
                    c.startingRate === null
                      ? 'Ask for a quote'
                      : formatPKRCompact(c.startingRate) + ' / ' + c.rateUnit,
                ],
                [
                  'Platforms',
                  (c: CreatorCardData) =>
                    c.platforms
                      .map((p) => p.platform + ' · ' + formatNumber(p.followers))
                      .join(', '),
                ],
                [
                  'Engagement',
                  (c: CreatorCardData) =>
                    c.engagementRate === null ? 'Not available' : c.engagementRate + '%',
                ],
                [
                  'Availability',
                  (c: CreatorCardData) =>
                    c.available ? 'Open to work' : 'Not currently available',
                ],
                ['Statistics', (c: CreatorCardData) => c.provenance || 'Profile statistics'],
              ].map(([label, get]) => (
                <tr className="border-t border-anjuman-line" key={String(label)}>
                  <th scope="row" className="p-3 font-medium text-anjuman-ink-soft">
                    {String(label)}
                  </th>
                  {compared.map((c) => (
                    <td className="p-3 leading-relaxed" key={c.id}>
                      {typeof get === 'function' ? get(c) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </dialog>
    </section>
  );
}
