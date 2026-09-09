import Link from 'next/link';
import { ArrowUpRight, Search, Handshake, UserRound } from 'lucide-react';
import { Hero } from '@/components/landing/hero';
import { SiteFooter } from '@/components/landing/site-footer';
import { CreatorCard } from '@/components/creator/creator-card';
import { getPublicCreators } from '@/lib/creators';
export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };
export default async function HomePage() {
  const creators = await getPublicCreators({ take: 3 });
  return (
    <>
      <main>
        <Hero />
        <div className="border-y border-anjuman-line py-5">
          <div className="cc-container flex flex-wrap justify-between gap-5 text-sm text-anjuman-ink-soft">
            <span>Local perspectives. Original ideas.</span>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-anjuman-ink font-medium">
              <span>Instagram</span>
              <span>YouTube</span>
              <span>TikTok</span>
              <span>Facebook</span>
            </div>
          </div>
        </div>
        <section className="cc-container py-14 md:py-20">
          <div className="flex justify-between gap-5 items-end mb-7">
            <div>
              <p className="cc-eyebrow mb-3">Meet the community</p>
              <h2 className="cc-title">Your next collaborator is here.</h2>
            </div>
            <Link
              href="/creators"
              className="cc-link text-sm hidden sm:flex items-center gap-1 shrink-0"
            >
              Explore creators <ArrowUpRight size={17} />
            </Link>
          </div>
          {creators.length ? (
            <div className="grid md:grid-cols-3 gap-5">
              {creators.map((c) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
              {creators.length < 3 && (
                <div
                  className={
                    'cc-panel bg-[#f0ebe7] p-8 flex flex-col justify-center ' +
                    (creators.length === 1 ? 'md:col-span-2' : '')
                  }
                >
                  <p className="cc-eyebrow mb-4">Make yourself known</p>
                  <h3 className="text-3xl font-medium max-w-md">
                    Your work belongs in good company.
                  </h3>
                  <p className="cc-subtle my-5 max-w-md">
                    Build a profile around your perspective, your portfolio, and the collaborations
                    you want to create.
                  </p>
                  <Link
                    href="/signin?callbackUrl=/creator/onboarding"
                    className="cc-button self-start"
                  >
                    Join the circle
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="cc-panel p-10 md:p-14 flex flex-col md:flex-row gap-6 justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold">Be part of the first circle.</h3>
                <p className="cc-subtle mt-2 max-w-md">
                  Create a profile with your work, your interests, and your rates. Give brands a
                  place to discover you.
                </p>
              </div>
              <Link href="/signin?callbackUrl=/creator/onboarding" className="cc-button">
                Create your profile
              </Link>
            </div>
          )}
          <Link href="/creators" className="cc-link text-sm mt-6 inline-flex sm:hidden">
            Explore all creators →
          </Link>
        </section>
        <section id="how" className="bg-[#f0ebe7] border-y border-anjuman-line py-14 md:py-20">
          <div className="cc-container">
            <div className="md:flex justify-between gap-8 mb-10">
              <div>
                <p className="cc-eyebrow mb-3">A better way to work together</p>
                <h2 className="cc-title">From discovery to possibility.</h2>
              </div>
              <p className="cc-subtle max-w-sm mt-4 md:mt-0">
                Whether you have a story to tell or the talent to tell it, start with the right
                connection.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  Icon: Search,
                  title: 'Find your people',
                  body: 'Explore creators by niche, location, platform, and the work they share.',
                },
                {
                  Icon: UserRound,
                  title: 'Get to know their work',
                  body: 'Compare profiles and rates. Save the people who feel right for your brand.',
                },
                {
                  Icon: Handshake,
                  title: 'Start with a clear brief',
                  body: 'Post a campaign with your goals and budget. Review proposals in your workspace.',
                },
              ].map(({ Icon, title, body }, i) => (
                <div key={title} className="border-t border-[#d6cbc8] pt-6">
                  <div className="flex justify-between mb-5">
                    <Icon size={24} strokeWidth={1.5} className="text-anjuman-purple" />
                    <span className="text-sm text-anjuman-ink-soft">0{i + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{title}</h3>
                  <p className="cc-subtle">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="cc-container pt-14 md:pt-20">
          <div className="bg-[#392333] text-white rounded-xl p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <p className="text-xs tracking-[.15em] uppercase text-[#dfc5d4] mb-3">
                Make room for good work
              </p>
              <h2 className="text-3xl md:text-4xl font-medium max-w-xl">
                Find your people.
                <br />
                Create your next chapter.
              </h2>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <Link
                href="/creators"
                className="cc-button bg-white text-[#392333] hover:bg-[#f0e6ec]"
              >
                I&apos;m looking for creators <ArrowUpRight size={17} />
              </Link>
              <Link
                href="/signin?callbackUrl=/creator/onboarding"
                className="cc-button border border-white/40 bg-transparent hover:bg-white/10"
              >
                I&apos;m a creator
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
