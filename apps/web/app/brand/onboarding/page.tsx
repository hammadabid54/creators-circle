import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BrandOnboardingForm } from './form';

export default async function BrandOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'brand') redirect('/onboarding/role');

  const profile = await db.brandProfile.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <main className="min-h-screen bg-anjuman-bg">
      <BrandOnboardingForm
        initial={{
          company: profile?.company ?? '',
          industry: profile?.industry ?? '',
          ntn: profile?.ntn ?? '',
          website: profile?.website ?? '',
          city: profile?.city ?? '',
          monthlyBudget: profile?.monthlyBudget ?? '',
          preferredNiches: profile?.preferredNiches
            ? (JSON.parse(profile.preferredNiches) as string[])
            : [],
        }}
      />
    </main>
  );
}
