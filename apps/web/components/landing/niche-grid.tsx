import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section, SectionHeader } from '@/components/section';
import { BurstCluster } from '@/components/cultural/burst-cluster';
import { niches } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * Niche grid — refined.
 * One treatment × 12 cards. Visual energy comes from the icons,
 * not 12 different gradients. Top 3 niches get a small "Trending"
 * mark made from the BurstCluster motif.
 */
export function NicheGrid() {
  return (
    <Section id="niches" className="pt-0">
      <SectionHeader
        title="Browse creators by niche"
        subtitle="From lifestyle to fitness, food to tech — every kind of creator, in one place."
        ctaLabel="All niches"
        ctaHref="/creators"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {niches.map((n) => {
          const Icon = n.icon;
          const isTop = n.tier === 'top';
          return (
            <Link
              key={n.id}
              href={`/creators?niche=${n.id}`}
              className={cn(
                'group relative bg-white border border-anjuman-line rounded-2xl p-5 min-h-[160px]',
                'flex flex-col justify-between overflow-hidden anj-card-lift',
                'hover:border-anjuman-purple/40',
              )}
            >
              {/* Top tier mark — BurstCluster as a small accent */}
              {isTop && (
                <div
                  className="absolute top-3 right-3 opacity-60 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                >
                  <BurstCluster size="sm" variant="pink" />
                </div>
              )}

              {/* Icon in gradient circle */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(131,56,236,0.20)]"
                style={{ background: n.iconGradient }}
                aria-hidden="true"
              >
                <Icon className="w-6 h-6" strokeWidth={2.25} />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-base md:text-lg leading-tight">
                    {n.name}
                  </h3>
                  {isTop && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-anjuman-pink">
                      Trending
                    </span>
                  )}
                </div>
                <div className="text-xs text-anjuman-ink-soft mt-0.5">{n.count} creators</div>
              </div>

              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-anjuman-ink-soft opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
