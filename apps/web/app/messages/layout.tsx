import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ConversationSidebar } from '@/components/messaging/conversation-sidebar';

/**
 * Messenger shell. The sidebar lives at the left (or the top on mobile)
 * and the active thread renders in the main column. Grouping by
 * (brand, creator) pair is handled inside ConversationSidebar so the
 * same partner only opens one row even when there's an application
 * thread AND a contract thread.
 */
export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/messages');

  return (
    <div className="cc-container max-w-6xl py-6 md:py-10">
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 lg:gap-6 min-h-[70vh]">
        <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]">
          <ConversationSidebar />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
