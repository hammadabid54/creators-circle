'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

const NICHE_TO_PATH: Record<string, string> = {
  Fashion: 'fashion',
  'Food & Cooking': 'food-and-cooking',
  'Tech & Gadgets': 'tech-and-gadgets',
  'Beauty & Makeup': 'beauty-and-makeup',
  Fitness: 'fitness',
};

const QUICK_PICKS = [
  'Fashion',
  'Food & Cooking',
  'Tech & Gadgets',
  'Beauty & Makeup',
  'Fitness',
] as const;

export function HeroContent() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center p-8 sm:p-10 md:p-12 lg:p-14 text-white">
      <p className="text-[11px] sm:text-xs uppercase tracking-[.18em] text-white/75 mb-3 sm:mb-4 font-medium">
        Pakistan&apos;s creator marketplace
      </p>
      <h1 className="text-[36px] sm:text-[44px] md:text-[54px] lg:text-[62px] leading-[1.05] tracking-[-0.035em] font-semibold max-w-[640px]">
        Find the creator who gets your brand.
      </h1>
      <p className="mt-4 sm:mt-5 text-[15px] sm:text-base md:text-lg text-white/90 leading-relaxed max-w-xl">
        Find Pakistani creators who understand your brand. Compare their work, agree on the rate, and
        start in minutes.
      </p>

      <div className="mt-6 sm:mt-7 flex items-center bg-white rounded-full overflow-hidden max-w-2xl shadow-lg border border-white/30">
        <input
          type="text"
          placeholder="Describe what you need to hire for…"
          aria-label="What you want to hire for"
          className="flex-1 px-5 sm:px-6 py-3 sm:py-3.5 text-black placeholder:text-black/45 outline-none bg-transparent text-sm md:text-base min-w-0"
        />
        <button
          type="submit"
          className="bg-[var(--color-anjuman-purple)] text-white px-5 sm:px-7 py-3 sm:py-3.5 flex items-center gap-2 text-sm font-semibold hover:bg-[#4a2439] transition-colors shrink-0"
        >
          <Search size={16} strokeWidth={2.5} />
          Search
        </button>
      </div>

      <div className="mt-4 sm:mt-5 flex gap-2 flex-wrap items-center">
        <span className="text-[11px] uppercase tracking-wide text-white/60 mr-1">Explore</span>
        {QUICK_PICKS.map((n) => (
          <Link
            key={n}
            href={'/discover/' + (NICHE_TO_PATH[n] || n.toLowerCase().replace(/[^a-z]+/g, '-'))}
            className="py-1.5 px-3.5 rounded-full border border-white/30 hover:bg-white/15 text-[13px] sm:text-sm transition-colors"
          >
            {n}
          </Link>
        ))}
      </div>

      <p className="mt-5 text-[13px] text-white/75">
        Here to create?{' '}
        <Link
          href="/onboarding/role?intent=signup&role=creator"
          className="underline underline-offset-2 hover:text-white"
        >
          Build your profile
        </Link>
      </p>
    </div>
  );
}
