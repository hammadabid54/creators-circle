import { DiscoveryIndex } from '@/components/discovery-index';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator cities in Pakistan | Kollabo',
  alternates: { canonical: '/discover/cities' },
};
export default function Page() {
  return <DiscoveryIndex kind="city" />;
}
