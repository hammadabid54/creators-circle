import { DiscoveryIndex } from '@/components/discovery-index';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator platforms | Kollabo',
  alternates: { canonical: '/discover/platforms' },
};
export default function Page() {
  return <DiscoveryIndex kind="platform" />;
}
