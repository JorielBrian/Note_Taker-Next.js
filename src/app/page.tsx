import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { checkSession } from '@/lib/session';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const [session, query] = await Promise.all([checkSession(), searchParams]);
  if (session.user) redirect('/notebooks');

  const sessionMessage = session.expired || query.reason === 'session-expired'
    ? 'expired'
    : query.reason === 'session-ended'
      ? 'ended'
      : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <AuthForm sessionMessage={sessionMessage} />
    </main>
  );
}
