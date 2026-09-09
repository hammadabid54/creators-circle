import { Section, SectionHeader } from '@/components/section';
import { brandSteps, creatorSteps } from '@/lib/mock-data';

function StepList({
  heading,
  who,
  steps,
}: {
  heading: string;
  who: string;
  steps: Array<{ n: number; title: string; body: string }>;
}) {
  return (
    <div className="bg-white border border-anjuman-line rounded-3xl p-7">
      <h3 className="font-display text-2xl font-bold mb-1">{heading}</h3>
      <p className="text-sm text-anjuman-ink-soft mb-7">{who}</p>
      <div className="space-y-6">
        {steps.map((s) => (
          <div key={s.n} className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FF006E] via-[#8338EC] to-[#00D9FF] text-white flex items-center justify-center font-display font-bold text-sm flex-shrink-0">
              {s.n}
            </div>
            <div>
              <h4 className="font-display font-bold text-base mb-1">{s.title}</h4>
              <p className="text-sm text-anjuman-ink-soft leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <Section id="how" className="pt-0">
      <SectionHeader
        title="How Creators Circle works"
        subtitle="Built for both sides of the marketplace."
        align="center"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StepList
          heading="For brands"
          who="Find, hire, and pay Pakistani creators."
          steps={brandSteps}
        />
        <StepList
          heading="For creators"
          who="Get discovered by Pakistan's best brands."
          steps={creatorSteps}
        />
      </div>
    </Section>
  );
}
