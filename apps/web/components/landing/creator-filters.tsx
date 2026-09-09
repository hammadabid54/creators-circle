'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
];

const FOLLOWER_RANGES = [
  { value: '0-10K', label: '0 – 10K' },
  { value: '10K-100K', label: '10K – 100K' },
  { value: '100K-500K', label: '100K – 500K' },
  { value: '500K-1M', label: '500K – 1M' },
  { value: '1M+', label: '1M+' },
];

const CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Other',
];

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'UR', label: 'Urdu' },
  { code: 'PN', label: 'Punjabi' },
  { code: 'SD', label: 'Sindhi' },
  { code: 'PS', label: 'Pashto' },
];

const SORTS = [
  { value: 'followers', label: 'Most followers' },
  { value: 'engagement', label: 'Highest engagement' },
  { value: 'newest', label: 'Newest' },
];

export function CreatorFilters({
  niches,
  selectedNiches,
  selectedPlatforms,
  selectedCity,
  selectedLanguage,
  followerRange,
  sort,
}: {
  niches: string[];
  selectedNiches: string[];
  selectedPlatforms: string[];
  selectedCity: string;
  selectedLanguage: string;
  followerRange: string;
  sort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nichesState, setNichesState] = useState<string[]>(selectedNiches);
  const [platformsState, setPlatformsState] = useState<string[]>(selectedPlatforms);
  const [, startTransition] = useTransition();

  const apply = useCallback(
    (overrides: Record<string, string | string[] | null> = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          params.delete(k);
        } else if (Array.isArray(v)) {
          params.set(k, v.join(','));
        } else {
          params.set(k, v);
        }
      }
      startTransition(() => {
        router.push(`/creators${params.toString() ? '?' + params.toString() : ''}`);
      });
    },
    [router, searchParams],
  );

  function toggleNiche(n: string) {
    const next = nichesState.includes(n) ? nichesState.filter((x) => x !== n) : [...nichesState, n];
    setNichesState(next);
    apply({ niche: next });
  }

  function togglePlatform(p: string) {
    const next = platformsState.includes(p)
      ? platformsState.filter((x) => x !== p)
      : [...platformsState, p];
    setPlatformsState(next);
    apply({ platform: next });
  }

  const hasFilters =
    selectedNiches.length > 0 ||
    selectedPlatforms.length > 0 ||
    selectedCity ||
    selectedLanguage ||
    followerRange;

  return (
    <div className="bg-white border border-anjuman-line rounded-3xl p-5 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base">Filters</h3>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setNichesState([]);
              setPlatformsState([]);
              apply({
                niche: null,
                platform: null,
                city: null,
                language: null,
                followers: null,
              });
            }}
            className="text-xs text-anjuman-purple font-semibold hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="mb-5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
          Sort by
        </label>
        <select
          value={sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-anjuman-line bg-anjuman-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-anjuman-purple"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Niches */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
          Niche
        </div>
        <div className="flex flex-wrap gap-1.5">
          {niches.map((n) => {
            const active = nichesState.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleNiche(n)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                  active
                    ? 'bg-anjuman-ink text-white border-anjuman-ink'
                    : 'bg-white text-anjuman-ink border-anjuman-line hover:border-anjuman-ink-soft',
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platforms */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
          Platform
        </div>
        <div className="space-y-1.5">
          {PLATFORMS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={platformsState.includes(p.id)}
                onChange={() => togglePlatform(p.id)}
                className="w-4 h-4 rounded border-anjuman-line text-anjuman-purple focus:ring-anjuman-purple"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      {/* Followers */}
      <div className="mb-5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
          Followers
        </label>
        <select
          value={followerRange}
          onChange={(e) => apply({ followers: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-anjuman-line bg-anjuman-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-anjuman-purple"
        >
          <option value="">Any</option>
          {FOLLOWER_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div className="mb-5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
          City
        </label>
        <select
          value={selectedCity}
          onChange={(e) => apply({ city: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-anjuman-line bg-anjuman-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-anjuman-purple"
        >
          <option value="">All Pakistan</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Languages */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
          Language
        </div>
        <select
          value={selectedLanguage}
          onChange={(e) => apply({ language: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-anjuman-line bg-anjuman-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-anjuman-purple"
        >
          <option value="">Any</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
