import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WorkspaceNav } from '@/components/workspace-nav';
import { formatPKR } from '@/lib/utils';
export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'creator') redirect('/onboarding/role');
  const applications = await db.application.findMany({
    where: { creatorId: session.user.id },
    include: {
      campaign: {
        include: {
          brand: { select: { brandProfile: { select: { company: true } } } },
          contracts: { where: { creatorId: session.user.id }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <main className="cc-container py-9 md:py-12">
      <div className="grid lg:grid-cols-[190px_1fr] gap-6 lg:gap-10">
        <aside>
          <WorkspaceNav role="creator" active="applications" />
        </aside>
        <div>
          <p className="cc-eyebrow mb-3">Keep track of your next chapter</p>
          <h1 className="cc-title">Your applications</h1>
          <p className="cc-subtle mt-3 mb-8">Every proposal is a new possibility.</p>
          {applications.length ? (
            <div className="space-y-4">
              {applications.map((a) => (
                <article key={a.id} className="cc-panel p-5 md:p-6">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <p className="text-xs text-anjuman-purple mb-1">
                        {a.campaign.brand.brandProfile?.company || 'Brand campaign'}
                      </p>
                      <Link href={'/creator/campaigns/' + a.campaignId}>
                        <h2 className="text-lg font-semibold">{a.campaign.title}</h2>
                      </Link>
                    </div>
                    <span className="text-xs px-3 py-1.5 rounded-full bg-[#f2eaf0] text-anjuman-purple capitalize">
                      {a.status === 'reject'
                        ? 'Declined'
                        : a.status === 'accept'
                          ? 'Accepted'
                          : a.status === 'invited'
                            ? 'Invited'
                            : a.status}
                    </span>
                  </div>
                  <p className="cc-subtle mt-4 whitespace-pre-wrap">{a.pitch}</p>
                  <div className="mt-4 pt-4 border-t border-anjuman-line flex flex-wrap gap-3 justify-between text-sm">
                    <span className="text-anjuman-ink-soft">
                      {a.proposedRate > 0 ? (
                        <>
                          Your proposal ·{' '}
                          <strong className="text-anjuman-ink">
                            {formatPKR(a.proposedRate)}
                          </strong>
                        </>
                      ) : (
                        <em className="text-anjuman-ink-soft">
                          Rate to be discussed in messages
                        </em>
                      )}
                    </span>
                    {a.campaign.contracts[0] ? (
                      <Link
                        className="cc-link inline-flex gap-1"
                        href={'/messages/' + a.campaign.contracts[0].id}
                      >
                        Open conversation
                        <ArrowUpRight size={15} />
                      </Link>
                    ) : (
                      <Link className="cc-link inline-flex gap-1" href={'/messages/' + a.id}>
                        Message brand
                        <ArrowUpRight size={15} />
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="cc-panel p-12 text-center">
              <FileText className="mx-auto text-anjuman-purple mb-4" size={28} />
              <h2 className="text-2xl font-semibold">Find a brief that feels like you.</h2>
              <p className="cc-subtle mt-3 mb-6">
                Your proposals and their progress will appear here.
              </p>
              <Link href="/creator/campaigns" className="cc-button cc-button-secondary">
                Explore opportunities
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
