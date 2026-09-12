import { publicSiteUrl } from '@/lib/site-url';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { SiteHeader } from '@/components/landing/site-header';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl() || 'http://localhost:3100'),
  title: 'Kollabo — Where Pakistani creators and brands meet',
  description:
    'Discover independent Pakistani creators. Explore their work, compare services, and find your next collaborator.',
  // Set full metadata shape (alternates, openGraph, twitter) so child routes don't
  // silently inherit homepage-only fields. See PLAN.md / Next.js Metadata gotcha.

  openGraph: {
    title: 'Kollabo — Where Pakistani creators and brands meet',
    description:
      'Discover independent Pakistani creators. Explore their work, compare services, and find your next collaborator.',
    url: '/',
    siteName: 'Kollabo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kollabo — Where Pakistani creators and brands meet',
    description:
      'Discover independent Pakistani creators. Explore their work, compare services, and find your next collaborator.',
  },
  icons: {
    icon: '/burst-mark.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <ToastProvider>
            <SiteHeader />
            <div id="page-content" tabIndex={-1}>
              {children}
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
