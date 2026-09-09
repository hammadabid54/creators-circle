import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CampaignForm } from './form';

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'brand') redirect('/onboarding/role');

  const sp = await searchParams;
  const invitedCreatorId = sp.invite || null;

  // Look up the invited creator's name for the form banner.
  let invitedCreator: { id: string; name: string; city: string | null } | null = null;
  if (invitedCreatorId) {
    const creator = await db.user.findUnique({
      where: { id: invitedCreatorId },
      select: {
        id: true,
        name: true,
        creatorProfile: { select: { id: true, city: true } },
      },
    });
    // Only set the banner if the user actually has a creator profile.
    if (creator?.creatorProfile) {
      invitedCreator = {
        id: creator.id,
        name: creator.name ?? 'Creator',
        city: creator.creatorProfile.city,
      };
    }
  }

  return (
    <main className="min-h-screen">
      <CampaignForm
        invitedCreator={invitedCreator}
        invitedCreatorId={invitedCreator?.id ?? null}
      />
    </main>
  );
}
