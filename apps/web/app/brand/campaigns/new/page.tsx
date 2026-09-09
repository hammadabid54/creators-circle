import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

import { CampaignForm } from './form';

export default async function NewCampaignPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'brand') redirect('/onboarding/role');

  return (
    <main className="min-h-screen">
      <CampaignForm />
    </main>
  );
}
