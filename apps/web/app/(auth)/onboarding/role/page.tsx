import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

import { RolePicker } from './role-picker';

export default async function RolePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  // If user already has a role, bounce to their dashboard.
  if (session.user.role === 'creator') redirect('/creator/dashboard');
  if (session.user.role === 'brand') redirect('/brand/dashboard');

  return <RolePicker />;
}
