import Image from 'next/image';
import { HeroContent } from './hero-content';

export function Hero() {
  return (
    <section className="cc-container pt-8 md:pt-14 pb-10 md:pb-14">
      <div className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] overflow-hidden rounded-[18px] bg-[#0E3A40]">
        <Image
          src="/images/hero-creator.webp"
          alt="A creator holding a jacket on a hanger in a studio, working with a microphone, phone gimbal, and laptop"
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
          className="object-cover"
        />
        {/* Left-side dark gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <HeroContent />
      </div>
    </section>
  );
}
