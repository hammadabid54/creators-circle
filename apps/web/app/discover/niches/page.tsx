import { DiscoveryIndex } from '@/components/discovery-index';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator niches and specialities | Creators Circle',
  alternates: { canonical: '/discover/niches' },
};
export default function Page() {
  return <DiscoveryIndex kind="niche" />;
}
