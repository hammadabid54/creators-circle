import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
import { parseList } from '@/lib/creators';
import { formatPKR, formatPKRCompact } from '@/lib/utils';
import { ApplicationActions } from './actions';
export default async function BrandCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  const campaign = await db.campaign.findFirst({
    where: { id, brandId: session.user.id },
    include: {
      applications: {
        include: {
          creator: {
            select: { name: true, image: true, creatorProfile: { select: { city: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      contracts: { select: { id: true, creatorId: true } },
    },
  });
  if (!campaign) notFound();
  const deliverables = JSON.parse(campaign.deliverables) as Array<{ type: string; qty: number }>;
  return (
    <main className="cc-container py-9 md:py-12">
      <Link href="/brand/campaigns" className="cc-link text-sm inline-flex gap-2 items-center mb-8">
        <ArrowLeft size={15} />
        Your campaigns
      </Link>
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="min-w-0">
          <p className="cc-eyebrow mb-3">Campaign workspace · {campaign.status}</p>
          <h1 className="cc-title">{campaign.title}</h1>
          <p className="cc-subtle mt-3">
            {campaign.applications.length} proposals · Published{' '}
            {campaign.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
          </p>
          <div className="flex flex-wrap gap-2 mt-5 mb-9">
            {parseList(campaign.targetNiches).map((n) => (
              <span
                key={n}
                className="border border-anjuman-line rounded-full bg-white px-3 py-1.5 text-xs"
              >
                {n}
              </span>
            ))}
          </div>
          <h2 className="text-2xl font-semibold mb-5">Meet your potential collaborators.</h2>
          {campaign.applications.length ? (
            <div className="space-y-4">
              {campaign.applications.map((a) => (
                <article className="cc-panel p-5 md:p-6" key={a.id}>
                  <div className="flex justify-between flex-wrap items-start gap-3">
                    <Link className="flex gap-3 items-center" href={'/creators/' + a.creatorId}>
                      <Avatar
                        name={a.creator.name || 'Creator'}
                        src={a.creator.image || undefined}
                      />
                      <div>
                        <h3 className="font-semibold">{a.creator.name || 'Creator'}</h3>
                        <p className="cc-subtle text-xs">
                          {a.creator.creatorProfile?.city || 'Pakistan'}
                        </p>
                      </div>
                    </Link>
                    <span className="text-xs text-anjuman-purple bg-[#f2eaf0] px-3 py-1.5 rounded-full capitalize">
                      {a.status === 'reject'
                        ? 'Declined'
                        : a.status === 'accept'
                          ? 'Accepted'
                          : a.status}
                    </span>
                  </div>
                  <p className="mt-5 text-sm text-anjuman-ink-soft leading-relaxed whitespace-pre-wrap">
                    {a.pitch}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-5 text-sm">
                    <span>
                      <span className="text-anjuman-ink-soft">Proposed rate </span>
                      <strong>{formatPKR(a.proposedRate)}</strong>
                    </span>
                    {a.timeline && <span className="text-anjuman-ink-soft">{a.timeline}</span>}
                  </div>
                  <ApplicationActions id={a.id} status={a.status} />
                  {campaign.contracts.find((c) => c.creatorId === a.creatorId) && (
                    <Link
                      className="cc-link text-sm inline-flex gap-1 mt-4"
                      href={
                        '/messages/' +
                        campaign.contracts.find((c) => c.creatorId === a.creatorId)!.id
                      }
                    >
                      Open conversation
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="cc-panel text-center px-6 py-14">
              <FileText size={28} className="mx-auto text-anjuman-purple mb-4" />
              <h3 className="text-xl font-semibold">Your brief is out in the world.</h3>
              <p className="cc-subtle mt-3">Creator proposals will appear here when they apply.</p>
            </div>
          )}
        </div>
        <aside>
          <div className="cc-panel p-6 lg:sticky lg:top-24">
            <p className="cc-eyebrow mb-4">The brief</p>
            <p className="text-xl font-semibold">
              {formatPKRCompact(campaign.budgetMin)} – {formatPKRCompact(campaign.budgetMax)}
            </p>
            <p className="cc-subtle text-xs mt-1">Campaign budget</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap mt-6">{campaign.brief}</p>
            <div className="border-t border-anjuman-line mt-6 pt-5">
              <h2 className="text-sm font-semibold mb-3">Deliverables</h2>
              <ul className="cc-subtle space-y-2">
                {deliverables.map((d, i) => (
                  <li key={i}>
                    {d.qty} × {d.type.replaceAll('_', ' ')}
                  </li>
                ))}
              </ul>
              {campaign.timeline && <p className="cc-subtle mt-5">{campaign.timeline}</p>}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
