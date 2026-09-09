'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function NicheRecommendations({ niches }: { niches: string[] }) {
  return (
    <div className="bg-[#eee5eb] border border-anjuman-purple/30 rounded-3xl p-5 mb-6 flex items-center gap-4">
      <Sparkles className="w-5 h-5 text-anjuman-purple flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Matching by your niches</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {niches.map((n) => (
            <span
              key={n}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-anjuman-line text-anjuman-ink"
            >
              {n}
            </span>
          ))}
        </div>
      </div>
      <Link
        href="/creator/onboarding"
        className="text-xs text-anjuman-purple font-semibold hover:underline whitespace-nowrap"
      >
        Edit
      </Link>
    </div>
  );
}
