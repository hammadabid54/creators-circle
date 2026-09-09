import Link from 'next/link';

import { BurstMark } from '@/components/brand/burst-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NichePill } from '@/components/creator/niche-pill';
import { PlatformPill } from '@/components/creator/platform-pill';
import { CreatorCard, type CreatorCardData } from '@/components/creator/creator-card';
import { Section, SectionHeader } from '@/components/section';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

const sampleCreators: CreatorCardData[] = [
  {
    id: '1',
    name: 'Sara Hassan',
    handle: 'sarahassan',
    city: 'Karachi',
    niches: ['Lifestyle', 'Fashion'],
    platforms: [
      { platform: 'instagram', followers: 248_000 },
      { platform: 'youtube', followers: 0 },
    ],
    engagementRate: 5.2,
    pastCollabs: 42,
    languages: ['EN', 'UR'],
    startingRate: 35_000,
    rateUnit: 'post',
    verified: true,
  },
  {
    id: '2',
    name: 'Usman Ali',
    handle: 'usmanali',
    city: 'Lahore',
    niches: ['Tech', 'Education'],
    platforms: [
      { platform: 'instagram', followers: 184_000 },
      { platform: 'youtube', followers: 1_200_000 },
    ],
    engagementRate: 4.8,
    pastCollabs: 28,
    languages: ['EN', 'UR'],
    startingRate: 120_000,
    rateUnit: 'video',
    verified: true,
  },
  {
    id: '3',
    name: 'Maha Khan',
    handle: 'mahakhan',
    city: 'Islamabad',
    niches: ['Beauty', 'Lifestyle'],
    platforms: [
      { platform: 'instagram', followers: 186_000 },
      { platform: 'tiktok', followers: 52_000 },
    ],
    engagementRate: 6.1,
    pastCollabs: 19,
    languages: ['EN', 'UR'],
    startingRate: 25_000,
    rateUnit: 'post',
    verified: true,
  },
];

const tokens = [
  { name: 'Pink', token: 'anjuman-pink', hex: '#FF006E' },
  { name: 'Purple', token: 'anjuman-purple', hex: '#8338EC' },
  { name: 'Cyan', token: 'anjuman-cyan', hex: '#00D9FF' },
  { name: 'Yellow', token: 'anjuman-yellow', hex: '#FFD60A' },
  { name: 'Green', token: 'anjuman-green', hex: '#25D366' },
  { name: 'Ink', token: 'anjuman-ink', hex: '#0A0A0F' },
  { name: 'Ink Soft', token: 'anjuman-ink-soft', hex: '#4A4A55' },
  { name: 'Line', token: 'anjuman-line', hex: '#E5E5EA' },
];

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen">
      <Section className="pb-12 pt-16 md:pt-24">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="verified" className="mb-6" icon={<Sparkles className="w-3 h-3" />}>
            Design system preview
          </Badge>
          <div className="flex items-center justify-center gap-3 mb-8">
            <BurstMark size={48} />
            <Wordmark size="xl" />
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
            Creators Circle{' '}
            <span className="bg-gradient-to-r from-[#FF006E] via-[#8338EC] to-[#00D9FF] bg-clip-text text-transparent">
              design system
            </span>
          </h1>
          <p className="text-lg text-anjuman-ink-soft mb-8">
            Every component the product needs, built on the Creator-Pop brand identity.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-anjuman-purple font-semibold hover:gap-3 transition-all"
          >
            View the live landing page <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader
          title="Brand mark"
          subtitle="The Creators Circle burst + wordmark, in 4 sizes."
        />
        <div className="flex flex-wrap items-end gap-10">
          <div className="flex flex-col items-center gap-2">
            <BurstMark size={64} />
            <span className="text-xs text-anjuman-ink-soft">64px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BurstMark size={44} />
            <span className="text-xs text-anjuman-ink-soft">44px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BurstMark size={28} />
            <span className="text-xs text-anjuman-ink-soft">28px</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BurstMark size={20} />
            <span className="text-xs text-anjuman-ink-soft">20px</span>
          </div>
          <div className="ml-auto">
            <Logo markSize={36} />
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader
          title="Color tokens"
          subtitle="Use these in tailwind via bg-{token}, text-{token}, border-{token}."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tokens.map((t) => (
            <div
              key={t.token}
              className="rounded-2xl border border-anjuman-line overflow-hidden bg-white"
            >
              <div
                className="h-20"
                style={{ backgroundColor: t.hex }}
                aria-label={`${t.name} swatch`}
              />
              <div className="p-3">
                <div className="font-display font-bold text-sm">{t.name}</div>
                <div className="text-xs text-anjuman-ink-soft">{t.token}</div>
                <div className="text-xs text-anjuman-ink-soft font-mono mt-0.5">{t.hex}</div>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-anjuman-line overflow-hidden bg-white">
            <div
              className="h-20"
              style={{
                background: 'linear-gradient(120deg, #FF006E 0%, #8338EC 50%, #00D9FF 100%)',
              }}
              aria-label="Primary gradient"
            />
            <div className="p-3">
              <div className="font-display font-bold text-sm">Gradient</div>
              <div className="text-xs text-anjuman-ink-soft">brand-cta</div>
              <div className="text-xs text-anjuman-ink-soft font-mono mt-0.5">
                #FF006E → #00D9FF
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader title="Buttons" subtitle="Five variants, three sizes." />
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Hire a creator</Button>
            <Button variant="gradient">Get started</Button>
            <Button variant="outline">View profile</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="white">Free to post</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large CTA</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="gradient" size="sm" disabled>
              Disabled
            </Button>
            <Button variant="gradient" fullWidth className="md:max-w-xs">
              Full width
            </Button>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader title="Avatars" subtitle="Gradient fallback with initials. 6 sizes." />
        <div className="flex flex-wrap items-end gap-6">
          {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Avatar name="Sara Hassan" size={size} />
              <span className="text-xs text-anjuman-ink-soft">{size}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {['Usman Ali', 'Maha Khan', 'Ali Shah', 'Fatima Riaz', 'Hira Ahmed'].map((n) => (
            <Avatar key={n} name={n} size="md" />
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader title="Badges & pills" subtitle="Niche, verified, pro, success." />
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="verified" icon={<Check className="w-2.5 h-2.5" />}>
            Verified
          </Badge>
          <Badge variant="pro">Pro</Badge>
          <Badge variant="success" icon={<Check className="w-2.5 h-2.5" />}>
            Active
          </Badge>
          <Badge variant="soft">Soft</Badge>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <NichePill niche="Lifestyle" />
          <NichePill niche="Fashion" />
          <NichePill niche="Beauty" />
          <NichePill niche="Tech" />
          <NichePill niche="Fitness" />
          <NichePill niche="Food" />
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader
          title="Platform pills"
          subtitle="All four social platforms with brand colors."
        />
        <div className="flex flex-wrap items-center gap-3">
          <PlatformPill platform="instagram" followers={248_000} />
          <PlatformPill platform="youtube" followers={1_200_000} />
          <PlatformPill platform="tiktok" followers={52_000} />
          <PlatformPill platform="facebook" followers={86_000} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PlatformPill platform="instagram" followers={184_000} size="sm" />
          <PlatformPill platform="youtube" followers={88_000} size="sm" />
          <PlatformPill platform="tiktok" followers={12_000} size="sm" />
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader
          title="Creator cards"
          subtitle="The most-shared surface. Used in search results, brand dashboards, and discovery."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleCreators.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader title="Type scale" subtitle="Inter for body, Space Grotesk for display." />
        <div className="space-y-3">
          <div>
            <div className="text-xs text-anjuman-ink-soft uppercase tracking-wider">
              Display 4xl
            </div>
            <div className="font-display text-4xl font-bold">Creators Circle of creators</div>
          </div>
          <div>
            <div className="text-xs text-anjuman-ink-soft uppercase tracking-wider">
              Display 2xl
            </div>
            <div className="font-display text-2xl font-bold">Where creators and brands meet</div>
          </div>
          <div>
            <div className="text-xs text-anjuman-ink-soft uppercase tracking-wider">Body lg</div>
            <div className="text-lg">
              The local marketplace for hiring and getting hired. Pay in PKR.
            </div>
          </div>
          <div>
            <div className="text-xs text-anjuman-ink-soft uppercase tracking-wider">Body base</div>
            <div className="text-base">
              Get paid in JazzCash or EasyPaisa within 48 hours of approval.
            </div>
          </div>
          <div>
            <div className="text-xs text-anjuman-ink-soft uppercase tracking-wider">Body sm</div>
            <div className="text-sm text-anjuman-ink-soft">
              Free to sign up. No monthly fees. 10% commission on completed contracts.
            </div>
          </div>
        </div>
      </Section>

      <footer className="border-t border-anjuman-line mt-12 py-10 px-5 text-center text-sm text-anjuman-ink-soft">
        <div className="flex items-center justify-center gap-2 mb-3">
          <BurstMark size={20} />
          <Wordmark size="sm" />
        </div>
        <p>
          Creators Circle design system · v0.1 ·{' '}
          <Link href="/plan" className="hover:text-anjuman-ink">
            Read PLAN.md
          </Link>
        </p>
      </footer>
    </main>
  );
}
