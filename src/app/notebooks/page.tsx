import { redirect } from 'next/navigation';
import { Workspace } from '@/components/workspace/Workspace';
import { getSessionUser } from '@/lib/session';

export default async function NotebooksPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');
  return <Workspace user={user} />;
}
