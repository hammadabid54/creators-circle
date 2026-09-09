import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="cc-container py-20 text-center">
      <p className="cc-eyebrow mb-4">404 · Not in this circle</p>
      <h1 className="cc-title">This page has moved on.</h1>
      <p className="cc-subtle mt-4 mb-7">
        The link may be out of date, or this profile is no longer available.
      </p>
      <Link href="/creators" className="cc-button">
        Discover creators
      </Link>
    </main>
  );
}
