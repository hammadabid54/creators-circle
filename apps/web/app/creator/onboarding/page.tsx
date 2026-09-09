import { getTaxonomy } from '@/lib/discovery-taxonomy';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CreatorOnboardingWizard } from './wizard';

export default async function CreatorOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'creator') redirect('/onboarding/role');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      creatorProfile: {
        include: {
          socialAccounts: true,
          rateCard: true,
          portfolio: true,
        },
      },
    },
  });

  const taxonomy = await getTaxonomy();
  const profile = user?.creatorProfile;
  const socials = profile?.socialAccounts ?? [];
  const rate = profile?.rateCard;
  const niches: string[] = profile?.niches ? JSON.parse(profile.niches) : [];
  const languages: string[] = profile?.languages ? JSON.parse(profile.languages) : [];

  // Build initial social account state for the wizard
  const initialSocialAccounts = (['instagram', 'youtube', 'tiktok', 'facebook'] as const).reduce(
    (acc, platform) => {
      const existing = socials.find((s) => s.platform === platform);
      acc[platform] = {
        enabled: Boolean(existing),
        handle: existing?.handle ? existing.handle.replace(/^@/, '') : '',
        followers: existing ? String(existing.followers) : '',
      };
      return acc;
    },
    {} as Record<
      'instagram' | 'youtube' | 'tiktok' | 'facebook',
      { enabled: boolean; handle: string; followers: string }
    >,
  );

  return (
    <main className="min-h-screen bg-anjuman-bg">
      <CreatorOnboardingWizard
        taxonomy={taxonomy.map((t) => ({ kind: t.kind, value: t.value, label: t.label }))}
        userId={session.user.id}
        initial={{
          image: user?.image ?? '',
          available: profile?.available ?? true,
          portfolio: (profile?.portfolio ?? []).map((p) => ({
            type: p.type as 'image' | 'video' | 'link',
            url: p.url,
            caption: p.caption ?? '',
          })),
          name: user?.name ?? '',
          bio: profile?.bio ?? '',
          niches,
          languages,
          city: profile?.city ?? '',
          socialAccounts: initialSocialAccounts,
          rateCard: {
            postRate: rate?.postRate != null ? String(rate.postRate) : '',
            storyRate: rate?.storyRate != null ? String(rate.storyRate) : '',
            reelRate: rate?.reelRate != null ? String(rate.reelRate) : '',
            youtubeLongRate: rate?.youtubeLongRate != null ? String(rate.youtubeLongRate) : '',
            youtubeShortRate: rate?.youtubeShortRate != null ? String(rate.youtubeShortRate) : '',
          },
        }}
      />
    </main>
  );
}
