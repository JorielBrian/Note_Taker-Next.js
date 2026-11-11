import { redirect } from 'next/navigation';
import { Workspace } from '@/components/workspace/Workspace';
import { checkSession } from '@/lib/session';

export default async function NotebooksPage() {
  const session = await checkSession();
  if (!session.user) redirect(session.expired ? '/?reason=session-expired' : '/');
  return <Workspace user={session.user} />;
}
