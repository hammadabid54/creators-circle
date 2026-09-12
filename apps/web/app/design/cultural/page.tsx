import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { BurstCluster } from '@/components/cultural/burst-cluster';
import { TruckStripe } from '@/components/cultural/truck-stripe';
import { Gathering } from '@/components/cultural/gathering';
import { ArrowRight, Check } from 'lucide-react';

export default function CulturalMotifComparisonPage() {
  return (
    <main className="min-h-screen bg-anjuman-bg">
      <header className="border-b border-anjuman-line bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Logo href="/" />
          <div className="text-sm text-anjuman-ink-soft">
            Design review · <b className="text-anjuman-ink">Pick the motif</b>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-anjuman-purple">
          Cultural motif · compare
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 leading-tight">
          One small Pakistani detail,
          <br />
          repeated everywhere.
        </h1>
        <p className="text-anjuman-ink-soft max-w-2xl text-lg mb-2">
          Three options for a small visual signature that makes Kollabo feel made for
          Pakistan, not generic global SaaS. Each option below is shown the way it would actually
          live in the product — section dividers, empty states, button accents.
        </p>
        <p className="text-sm text-anjuman-ink-soft max-w-2xl">
          Pick the one that lands. If none land, we drop it and ship without.
        </p>
      </section>

      <MotifCard
        letter="A"
        title="Burst Cluster"
        subtitle="Brand mark, extended"
        description="The existing BurstMark (our logo) repeated as a 5-mark constellation. Extends a thing we already own, so the brand feels more cohesive over time. Most 'design system' approach — easy to scale, hard to mess up."
        pros={[
          'Already in the brand — extends existing equity',
          'Reads at any size (16px to 80px)',
          'Mono variant works in print + on dark backgrounds',
        ]}
        cons={[
          'Subtle — might not register as "Pakistani"',
          'Easy to overuse (limit to 1-2 per page)',
        ]}
        divider={
          <div className="py-6">
            <BurstCluster variant="pink" size="md" className="mx-auto" />
          </div>
        }
        emptyState={
          <div className="bg-white border border-dashed border-anjuman-line rounded-2xl p-10 text-center">
            <BurstCluster variant="pink" size="sm" className="mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold mb-1">No campaigns match yet</h3>
            <p className="text-sm text-anjuman-ink-soft">
              Try widening your filters. New campaigns post every week.
            </p>
          </div>
        }
        buttonAccent={
          <Button variant="gradient" size="md">
            Post a campaign
            <BurstCluster variant="mono" size="sm" className="ml-1" />
          </Button>
        }
      />

      <MotifCard
        letter="B"
        title="Truck Art Stripe"
        subtitle="Phool patti, distilled"
        description="A horizontal band of layered diamond shapes inspired by the decorative trim on Pakistani trucks. Bold, colorful, instantly recognizable. The risk is feeling like a costume — but used as a single 40px divider per page, it's a wink, not a wardrobe."
        pros={[
          'Most visually distinctive — registers immediately',
          'Tells the story without needing a caption',
          'Pairs naturally with the Final CTA section',
        ]}
        cons={[
          'Risk of feeling kitsch if used too much',
          'Mono variant loses most of its identity',
          'Dominant — needs to be the only ornament on a page',
        ]}
        divider={<TruckStripe variant="pink" className="my-2" />}
        emptyState={
          <div className="bg-white border border-dashed border-anjuman-line rounded-2xl overflow-hidden">
            <TruckStripe variant="pink" />
            <div className="p-10 text-center">
              <h3 className="font-display text-lg font-bold mb-1">No campaigns match yet</h3>
              <p className="text-sm text-anjuman-ink-soft">
                Try widening your filters. New campaigns post every week.
              </p>
            </div>
          </div>
        }
        buttonAccent={
          <div className="flex flex-col items-center gap-2">
            <TruckStripe variant="pink" className="w-48" />
            <Button variant="gradient" size="md">
              Post a campaign
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <MotifCard
        letter="C"
        title="Gathering"
        subtitle="Product name, visualized"
        description="Five abstract figures in a circle, each in a brand color. A visual expression of Kollabo as a community. Tells the product story without text. Most meaningful — but most figurative, which means it's the hardest to use everywhere."
        pros={[
          'Tells the product story (anjuman = gathering)',
          'Most distinctive at a glance',
          'Beautiful on empty states and 404s',
        ]}
        cons={[
          'Figurative — only works in a few placements',
          "Doesn't scale down to small dividers",
          'Might feel too literal / on-the-nose for some users',
        ]}
        divider={
          <div className="py-4 flex items-center justify-center gap-4">
            <div className="flex-1 h-px bg-anjuman-line" />
            <Gathering size={48} />
            <div className="flex-1 h-px bg-anjuman-line" />
          </div>
        }
        emptyState={
          <div className="bg-white border border-dashed border-anjuman-line rounded-2xl p-10 text-center">
            <Gathering size={120} className="mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold mb-1">No campaigns match yet</h3>
            <p className="text-sm text-anjuman-ink-soft max-w-sm mx-auto">
              Try widening your filters. New campaigns post every week — your first match is
              probably one niche away.
            </p>
          </div>
        }
        buttonAccent={
          <Button variant="gradient" size="md">
            <Gathering size={20} className="mr-1.5" />
            Post a campaign
            <ArrowRight className="w-4 h-4" />
          </Button>
        }
      />

      {/* Recommendation + decision helper */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12">
        <div className="bg-white border border-anjuman-line rounded-3xl p-8">
          <div className="flex items-start gap-3 mb-4">
            <Check className="w-5 h-5 text-anjuman-green flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">My recommendation</h2>
              <p className="text-sm text-anjuman-ink-soft">
                If I had to ship one: <b className="text-anjuman-ink">Burst Cluster (A)</b>.
                It&apos;s the safest — extends the brand mark we already have, works at any size,
                and never feels like a costume. Truck Art (B) is bolder but riskier. Gathering (C)
                is beautiful but limited in placement.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Picked label="A — Burst Cluster" desc="Safe. Brand-cohesive. Subtle." />
            <Picked label="B — Truck Art Stripe" desc="Bold. Most distinctive. Risk of kitsch." />
            <Picked label="C — Gathering" desc="Meaningful. Limited placements." />
            <Picked label="None" desc="Ship without a motif. Pure global SaaS." />
            <Picked label="A + B" desc="Cluster for dividers, truck stripe for one CTA only." />
            <Picked label="A + C" desc="Cluster for dividers, gathering for empty states." />
          </div>

          <p className="text-xs text-anjuman-ink-soft mt-6">
            Tell me your pick (or combination). I&apos;ll bake it into all 6 design chunks and show
            you the full walkthrough at the end.
          </p>
        </div>
      </section>
    </main>
  );
}

function MotifCard({
  letter,
  title,
  subtitle,
  description,
  pros,
  cons,
  divider,
  emptyState,
  buttonAccent,
}: {
  letter: string;
  title: string;
  subtitle: string;
  description: string;
  pros: string[];
  cons: string[];
  divider: React.ReactNode;
  emptyState: React.ReactNode;
  buttonAccent: React.ReactNode;
}) {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 mb-10">
      <div className="bg-white border border-anjuman-line rounded-3xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
          <div className="bg-gradient-to-br from-anjuman-pink/10 via-anjuman-purple/10 to-anjuman-cyan/10 p-7 flex flex-col items-start justify-center">
            <div className="font-display text-7xl font-bold bg-gradient-to-r from-[#FF006E] via-[#8338EC] to-[#00D9FF] bg-clip-text text-transparent leading-none">
              {letter}
            </div>
            <div className="font-display text-2xl font-bold mt-2">{title}</div>
            <div className="text-xs text-anjuman-ink-soft mt-1">{subtitle}</div>
          </div>
          <div className="p-7">
            <p className="text-sm text-anjuman-ink mb-5 leading-relaxed">{description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-anjuman-ink-soft font-semibold uppercase tracking-wider mb-1.5">
                  Good
                </div>
                <ul className="space-y-1">
                  {pros.map((p) => (
                    <li key={p} className="flex items-start gap-1.5">
                      <span className="text-anjuman-green">+</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-anjuman-ink-soft font-semibold uppercase tracking-wider mb-1.5">
                  Watch out
                </div>
                <ul className="space-y-1">
                  {cons.map((c) => (
                    <li key={c} className="flex items-start gap-1.5">
                      <span className="text-red-500">−</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* In-context previews */}
        <div className="border-t border-anjuman-line bg-anjuman-bg/50 p-7 space-y-6">
          <PreviewRow label="As a section divider">{divider}</PreviewRow>
          <PreviewRow label="On an empty state">{emptyState}</PreviewRow>
          <PreviewRow label="As a button accent">
            <div className="flex justify-center">{buttonAccent}</div>
          </PreviewRow>
        </div>
      </div>
    </section>
  );
}

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-anjuman-ink-soft mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function Picked({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="border border-dashed border-anjuman-line rounded-xl p-3 hover:border-anjuman-purple/40 hover:bg-anjuman-purple/5 transition cursor-default">
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-xs text-anjuman-ink-soft mt-0.5">{desc}</div>
    </div>
  );
}
