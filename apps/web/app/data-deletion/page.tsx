import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data deletion instructions | Kollabo',
  description: 'How to disconnect Meta and request deletion of your Kollabo account data.',
  alternates: { canonical: '/data-deletion' },
};

export default function DataDeletionPage() {
  return (
    <main className="cc-container max-w-3xl py-12 md:py-20">
      <p className="cc-eyebrow mb-3">Privacy and account control</p>
      <h1 className="cc-title">Data deletion instructions</h1>
      <p className="cc-subtle mt-5">
        You can disconnect Facebook and Instagram from your Kollabo account at any time. To request
        deletion of your Kollabo account and the personal data associated with it, follow the steps
        below.
      </p>

      <section className="cc-panel p-6 md:p-8 mt-8 space-y-5">
        <h2 className="text-2xl font-semibold">Request deletion</h2>
        <ol className="list-decimal pl-5 space-y-3 cc-subtle">
          <li>
            Email{' '}
            <a className="cc-link" href="mailto:support@kollabo.pk">
              support@kollabo.pk
            </a>{' '}
            from the email address associated with your Kollabo account.
          </li>
          <li>Use the subject “Delete my Kollabo account”.</li>
          <li>Include your Kollabo profile name or profile URL so we can identify the account.</li>
        </ol>
        <p className="cc-subtle">
          We will confirm the request and delete personal data within 30 days, except information we
          must retain for legal, fraud-prevention, dispute, or financial-record obligations.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold">Remove Meta access immediately</h2>
        <p className="cc-subtle">
          You can also remove Kollabo from Facebook under Settings &amp; privacy → Settings →
          Business integrations. Removing the integration stops future access. You can still email
          us to have previously imported data deleted from Kollabo.
        </p>
        <p>
          Read our{' '}
          <Link className="cc-link" href="/privacy">
            Privacy Policy
          </Link>{' '}
          for more information.
        </p>
      </section>
    </main>
  );
}
