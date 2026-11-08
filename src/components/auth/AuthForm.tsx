'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api } from '@/lib/api';
import { btnPrimary, input } from '@/lib/ui';

type Mode = 'login' | 'register';

export function AuthForm() {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirm('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isRegister && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await (isRegister ? api.register(username, password) : api.login(username, password));
      router.replace('/notebooks');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const tab = (m: Mode) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      mode === m ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Note Taker</h1>
        <p className="mt-1 text-sm text-muted">Your notebooks, private to you.</p>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
        <div role="tablist" aria-label="Sign in or create account" className="mb-5 flex gap-1 rounded-lg bg-bg p-1">
          <button type="button" role="tab" aria-selected={!isRegister} className={tab('login')} onClick={() => switchMode('login')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={isRegister} className={tab('register')} onClick={() => switchMode('register')}>
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor={`${id}-username`} className="mb-1 block text-sm font-medium">Username</label>
            <input id={`${id}-username`} type="text" required autoComplete="username" autoCapitalize="none" autoCorrect="off"
              spellCheck={false} minLength={isRegister ? 3 : 1} maxLength={30} pattern={isRegister ? '[A-Za-z0-9_]{3,30}' : undefined}
              value={username} onChange={(e) => setUsername(e.target.value)} className={input} />
            {isRegister && <p className="mt-1 text-xs text-muted">3-30 characters: letters, numbers, underscores.</p>}
          </div>
          <div>
            <label htmlFor={`${id}-pw`} className="mb-1 block text-sm font-medium">Password</label>
            <input id={`${id}-pw`} type="password" required minLength={isRegister ? 8 : 1} maxLength={128}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            {isRegister && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
          </div>
          {isRegister && (
            <div>
              <label htmlFor={`${id}-confirm`} className="mb-1 block text-sm font-medium">Confirm password</label>
              <input id={`${id}-confirm`} type="password" required autoComplete="new-password" maxLength={128}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            </div>
          )}

          <p role="alert" aria-live="polite" className={error ? 'text-sm text-danger' : 'sr-only'}>{error}</p>

          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
