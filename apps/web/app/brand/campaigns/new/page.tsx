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

  // Look up the invited creator for the form banner + niche pre-fill.
  let invitedCreator:
    | { id: string; name: string; city: string | null; niches: string[] }
    | null = null;
  if (invitedCreatorId) {
    const creator = await db.user.findUnique({
      where: { id: invitedCreatorId },
      select: {
        id: true,
        name: true,
        creatorProfile: {
          select: { id: true, city: true, niches: true },
        },
      },
    });
    if (creator?.creatorProfile) {
      // Parse the JSON-stored niches. Skip anything that doesn't match a
      // known NICHE_OPTIONS label so we don't pre-select an invalid value.
      let niches: string[] = [];
      try {
        const raw = JSON.parse(creator.creatorProfile.niches ?? '[]');
        if (Array.isArray(raw)) niches = raw.filter((n): n is string => typeof n === 'string');
      } catch {
        niches = [];
      }
      invitedCreator = {
        id: creator.id,
        name: creator.name ?? 'Creator',
        city: creator.creatorProfile.city,
        niches,
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
