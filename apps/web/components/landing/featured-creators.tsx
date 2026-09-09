import { Section, SectionHeader } from '@/components/section';
import { CreatorCard } from '@/components/creator/creator-card';
import { featuredCreators } from '@/lib/mock-data';

export function FeaturedCreators() {
  return (
    <Section id="featured" className="pt-0">
      <SectionHeader
        title="Featured creators this week"
        subtitle="Vetted, verified, and ready to start this week."
        ctaLabel="Browse all 2,400"
        ctaHref="/creators"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {featuredCreators.map((c) => (
          <CreatorCard key={c.id} creator={c} />
        ))}
      </div>
    </Section>
  );
}
