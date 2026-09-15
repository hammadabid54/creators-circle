import Image from 'next/image';
import { HeroContent } from './hero-content';

export function Hero() {
  return (
    <section className="cc-container pt-6 md:pt-14 pb-8 md:pb-14">
      {/* Mobile needs ~520px of vertical room to fit the headline + description
          + search + pills without overflowing. Desktop reverts to a 16:9 ratio
          so the side-by-side image+text layout has horizontal real estate. */}
      <div className="relative min-h-[520px] sm:min-h-[460px] md:min-h-0 md:aspect-[16/9] overflow-hidden rounded-[18px] bg-[#0E3A40]">
        <Image
          src="/images/hero-creator.webp"
          alt="A creator holding a jacket on a hanger in a studio, working with a microphone, phone gimbal, and laptop"
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
          className="object-cover object-[center_30%] md:object-[center_50%]"
        />
        {/* Mobile-first: vertical gradient. The hero is stacked on mobile
            (text top, image bottom), so a top-down dark gradient gives the
            text a readable backdrop without killing the image below. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/35 md:hidden" />
        {/* Desktop: horizontal gradient. Image is on the right, text on the
            left, so dark on the left fades to transparent on the right. */}
        <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <HeroContent />
      </div>
    </section>
  );
}
