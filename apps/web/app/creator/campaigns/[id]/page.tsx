import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

import { NichePill } from '@/components/creator/niche-pill';
import { ApplicationForm } from './form';

import { formatPKRCompact } from '@/lib/utils';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'creator') redirect('/onboarding/role');

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { brand: { include: { brandProfile: true } } },
  });
  if (!campaign) notFound();

  // Already applied?
  const existing = await db.application.findUnique({
    where: { campaignId_creatorId: { campaignId: id, creatorId: session.user.id } },
  });

  const niches = JSON.parse(campaign.targetNiches) as string[];
  const platforms = JSON.parse(campaign.targetPlatforms) as string[];
  const deliverables = JSON.parse(campaign.deliverables) as Array<{ type: string; qty: number }>;
  const company = campaign.brand.brandProfile?.company ?? campaign.brand.name;

  return (
    <main className="min-h-screen bg-anjuman-bg">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        <div className="bg-white border border-anjuman-line rounded-3xl p-8 mb-6">
          <div className="text-xs text-anjuman-ink-soft mb-1">Campaign by {company}</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">{campaign.title}</h1>
          <p className="text-anjuman-ink whitespace-pre-line mb-5">{campaign.brief}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <Stat
              label="Budget"
              value={`${formatPKRCompact(campaign.budgetMin)} – ${formatPKRCompact(campaign.budgetMax)}`}
            />
            <Stat
              label="Deliverables"
              value={String(deliverables.reduce((s, d) => s + d.qty, 0))}
            />
            <Stat label="Platforms" value={platforms.join(', ')} />
            {campaign.timeline && <Stat label="Timeline" value={campaign.timeline} />}
          </div>

          <div className="mb-3">
            <div className="text-xs uppercase tracking-wider font-semibold text-anjuman-ink-soft mb-2">
              Niche match
            </div>
            <div className="flex flex-wrap gap-1.5">
              {niches.map((n) => (
                <NichePill key={n} niche={n} />
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-anjuman-ink-soft mb-2">
              What they need
            </div>
            <ul className="text-sm space-y-1.5">
              {deliverables.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-anjuman-purple" />
                  <span className="capitalize">
                    {d.qty} × {d.type.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {existing ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-emerald-800 font-semibold">You applied to this campaign</p>
            <p className="text-xs text-emerald-700 mt-1">
              Status: {existing.status}. The brand will review your proposal and respond.
            </p>
            <Link
              href="/creator/applications"
              className="inline-block mt-3 text-xs text-emerald-800 font-semibold hover:underline"
            >
              View all applications →
            </Link>
          </div>
        ) : campaign.status !== 'open' ? (
          <div className="bg-anjuman-line-soft rounded-2xl p-5 text-center text-sm text-anjuman-ink-soft">
            This campaign is {campaign.status} and no longer accepting applications.
          </div>
        ) : (
          <ApplicationForm campaignId={campaign.id} />
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-anjuman-line-soft/50 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-anjuman-ink-soft font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}
