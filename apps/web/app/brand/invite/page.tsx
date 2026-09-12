import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { InviteForm } from './invite-form';

export default async function BrandInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ creatorId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/brand/invite');
  if (session.user.role !== 'brand') redirect('/onboarding/role');

  const { creatorId } = await searchParams;
  if (!creatorId) redirect('/creators');

  const creator = await db.user.findFirst({
    where: { id: creatorId, creatorProfile: { isNot: null } },
    select: {
      id: true,
      name: true,
      creatorProfile: { select: { slug: true } },
    },
  });
  if (!creator) redirect('/creators');

  const campaigns = await db.campaign.findMany({
    where: { brandId: session.user.id, status: 'open' },
    select: { id: true, title: true, budgetMin: true, budgetMax: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main className="cc-container py-9 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="brand" active="campaigns" />
        </aside>
        <div>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Workspace', href: '/brand/dashboard' },
              { label: 'Discover creators', href: '/creators' },
              {
                label: creator.name || 'Creator',
                href: '/creators/' + (creator.creatorProfile?.slug || creator.id),
              },
              { label: 'Invite' },
            ]}
          />
          <div className="mt-6">
            <p className="cc-eyebrow mb-3">Reach out directly</p>
            <h1 className="cc-title">
              Invite {creator.name || 'this creator'} to a campaign
            </h1>
            <p className="cc-subtle mt-3 mb-8">
              Pick one of your open campaigns. The creator sees the invite
              in their Applications and can accept with a proposed rate or
              decline.
            </p>
          </div>

          {campaigns.length === 0 ? (
            <div className="cc-panel p-10 text-center">
              <p className="text-lg font-semibold mb-2">No open campaigns yet.</p>
              <p className="cc-subtle mb-6">
                Post a campaign first, then come back here to invite creators.
              </p>
              <Link href="/brand/campaigns/new" className="cc-button">
                Create a campaign <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <InviteForm
              creatorId={creator.id}
              creatorName={creator.name || 'this creator'}
              campaigns={campaigns}
            />
          )}
        </div>
      </div>
    </main>
  );
}
