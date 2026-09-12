import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
export function SiteFooter() {
  return (
    <footer className="border-t border-anjuman-line mt-20 py-10">
      <div className="cc-container">
        <div className="flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <Logo />
            <p className="cc-subtle mt-3">Independent talent. Meaningful collaborations.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-start gap-x-7 gap-y-4 text-sm">
            <Link href="/creators">Discover creators</Link>
            <Link href="/creator/campaigns">Find work</Link>
            <Link href="/#how">How it works</Link>
          </nav>
        </div>
        <div className="mt-9 pt-6 border-t border-anjuman-line flex flex-wrap gap-3 justify-between text-xs text-anjuman-ink-soft">
          <span>© {new Date().getFullYear()} Kollabo</span>
          <span>Made for Pakistan&apos;s creative community.</span>
        </div>
      </div>
    </footer>
  );
}
