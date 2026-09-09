import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BurstCluster } from '@/components/cultural/burst-cluster';

/**
 * Final CTA — dark variant.
 * Replaces the previous big pink-purple-cyan gradient block
 * (which competed with the hero). Dark ink bg + yellow accent
 * echo the trust strip for visual rhythm.
 */
export function FinalCTA() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 pt-12 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-anjuman-ink text-white px-6 md:px-12 py-14 md:py-20">
        {/* BurstCluster as a single ornament in the corner */}
        <div className="absolute -top-4 -right-4 opacity-20" aria-hidden="true">
          <BurstCluster variant="mono" size="lg" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-anjuman-yellow" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-anjuman-yellow">
              Creators Circle · Free to join
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.02]">
            Hire your next creator this week.
          </h2>
          <p className="text-lg opacity-80 mb-8 leading-relaxed">
            800+ Pakistani brands are already on Creators Circle. Post a campaign, review proposals,
            pay in PKR through escrow.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/signin">
              <Button variant="white" size="lg" className="text-anjuman-ink font-semibold">
                Get started — it&apos;s free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/creators">
              <Button
                variant="ghost"
                size="lg"
                className="text-white border border-white/25 hover:bg-white/10"
              >
                Browse creators first
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
