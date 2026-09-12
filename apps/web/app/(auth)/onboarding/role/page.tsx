import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

import { RolePicker } from './role-picker';

export default async function RolePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; intent?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();

  // If the user is already signed in, look up their phone so we can show
  // a friendly "you're already a [role]" hint and surface a sign-out
  // action. We do NOT redirect away — the whole point of this page is to
  // give people a clear creator/brand choice.
  let existingRole: 'creator' | 'brand' | null = null;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role === 'creator' || user?.role === 'brand') existingRole = user.role;
  }

  return (
    <RolePicker
      initialRole={sp.role as 'creator' | 'brand' | undefined}
      pendingSignup={sp.intent === 'signup'}
      existingRole={existingRole}
    />
  );
}
