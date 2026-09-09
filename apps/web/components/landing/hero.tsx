import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
export function Hero() {
  return (
    <section className="cc-container pt-10 md:pt-16 pb-12 md:pb-16">
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
        <div>
          <p className="cc-eyebrow mb-5">Pakistan&apos;s creative community</p>
          <h1 className="text-[42px] sm:text-[54px] xl:text-[62px] leading-[1.06] tracking-[-0.055em] font-semibold max-w-[620px]">
            Good things happen
            <br className="hidden sm:block" /> in the right{' '}
            <span className="text-anjuman-purple">circle.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-anjuman-ink-soft leading-relaxed max-w-lg">
            Find independent creators who understand your brand. Discover their work, explore their
            rates, and make something that matters.
          </p>
          <form
            action="/creators"
            className="mt-8 flex items-center gap-2 p-2 bg-white border border-[#d9cfd4] rounded-xl shadow-[0_3px_12px_#30212c05]"
            role="search"
          >
            <Search
              className="ml-3 text-anjuman-ink-soft shrink-0 hidden sm:block"
              size={20}
              aria-hidden
            />
            <label htmlFor="creator-search" className="sr-only">
              Search creators by name or niche
            </label>
            <input
              id="creator-search"
              name="q"
              type="search"
              placeholder="Try fashion, food, or a creator's name"
              className="min-w-0 flex-1 px-2 py-3 bg-transparent outline-none text-sm"
            />
            <button className="cc-button shrink-0" type="submit">
              Find creators
            </button>
          </form>
          <div className="mt-4 flex gap-2 flex-wrap items-center text-xs text-anjuman-ink-soft">
            <span>Explore:</span>
            {[
              ['Fashion', 'fashion'],
              ['Food & Cooking', 'food-and-cooking'],
              ['Lifestyle', 'lifestyle'],
              ['Tech & Gadgets', 'tech-and-gadgets'],
            ].map(([n, path]) => (
              <Link
                key={n}
                href={'/discover/' + path}
                className="py-1.5 px-3 rounded-full border border-anjuman-line hover:bg-white"
              >
                {n}
              </Link>
            ))}
          </div>
          <p className="mt-7 text-sm text-anjuman-ink-soft">
            Here to create?{' '}
            <Link
              href="/signin?callbackUrl=/creator/onboarding"
              className="cc-link inline-flex items-center gap-1 ml-1"
            >
              Build your profile <ArrowUpRight size={15} />
            </Link>
          </p>
        </div>
        <figure className="hidden lg:block relative">
          <div className="aspect-[1.04] overflow-hidden rounded-[14px] bg-[#e9e3dd]">
            <Image
              priority
              src="/images/circle-workspace.jpg"
              alt="A camera and creative tools arranged on a workspace"
              width="900"
              height="900"
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="flex justify-between gap-3 mt-3 text-xs text-anjuman-ink-soft">
            <span>Behind every brand is a creative point of view.</span>
            <span>Editorial inspiration</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
