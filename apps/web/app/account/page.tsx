import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmailForm } from './email-form';
export const metadata = {
  title: 'Account settings | Kollabo',
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/account');
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/signin');
  return (
    <main className="cc-container py-12 max-w-2xl">
      <Breadcrumb
        items={[
          {
            label: 'Workspace',
            href:
              user.role === 'brand'
                ? '/brand/dashboard'
                : user.role === 'creator'
                  ? '/creator/dashboard'
                  : '/onboarding/role',
          },
          { label: 'Account settings' },
        ]}
      />
      <h1 className="cc-title mt-6">Account settings</h1>
      <p className="cc-subtle mt-3 mb-6">
        Your sign-in details are private and are not shown on your public profile.
      </p>
      <div className="cc-panel p-6 space-y-4">
        <p>Phone: {user.phone || 'Not added'}</p>
        <p>
          Email: {user.email || 'Not added'} {user.emailVerified ? '(verified)' : ''}
        </p>
        {!user.email && <EmailForm />}
      </div>
    </main>
  );
}
