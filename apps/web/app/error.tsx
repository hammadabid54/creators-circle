'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="cc-container py-20 text-center">
      <p className="cc-eyebrow mb-4">A small interruption</p>
      <h1 className="cc-title">We couldn&apos;t load this page.</h1>
      <p className="cc-subtle mt-4 mb-7">
        Please try again. If the problem continues, return to your workspace.
      </p>
      <div className="flex justify-center gap-3">
        <button className="cc-button" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="cc-button cc-button-secondary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
