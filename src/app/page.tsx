import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { getSessionUser } from '@/lib/session';

export default async function HomePage() {
  if (await getSessionUser()) redirect('/notebooks');
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <AuthForm />
    </main>
  );
}
