'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { publishSessionEvent } from '@/lib/session-sync';
import { SessionActivity } from '@/components/auth/SessionActivity';
import type { Note, NoteSummary, Notebook, User } from '@/lib/types';
import { btn } from '@/lib/ui';
import { NoteEditor } from './NoteEditor';
import { NoteListPane } from './NoteListPane';
import { NotebookPane } from './NotebookPane';

type View = 'notebooks' | 'notes' | 'editor';

const byName = (a: Notebook, b: Notebook) => a.name.localeCompare(b.name);
const byRecent = (a: NoteSummary, b: NoteSummary) => b.updatedAt.localeCompare(a.updatedAt);
const toSummary = (n: Note): NoteSummary => ({
  id: n.id, notebookId: n.notebookId, title: n.title, snippet: n.content.slice(0, 140), updatedAt: n.updatedAt,
});

export function Workspace({ user }: { user: User }) {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[] | null>(null);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [view, setView] = useState<View>('notebooks');
  const [notice, setNotice] = useState<string | null>(null);

  const guard = useCallback(async (action: () => Promise<void>) => {
    setNotice(null);
    try { await action(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Something went wrong'); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.listNotebooks()
      .then((list) => { if (!cancelled) { setNotebooks(list); setNotebookId((cur) => cur ?? list[0]?.id ?? null); } })
      .catch((e: Error) => { if (!cancelled) { setNotebooks([]); setNotice(e.message); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notebookId) { setNotes(null); return; }
    let cancelled = false;
    setNotes(null);
    api.listNotes(notebookId)
      .then((list) => !cancelled && setNotes(list))
      .catch((e: Error) => { if (!cancelled) { setNotes([]); setNotice(e.message); } });
    return () => { cancelled = true; };
  }, [notebookId]);

  const adjustCount = (id: string, delta: number) =>
    setNotebooks((list) => list?.map((n) => (n.id === id ? { ...n, noteCount: Math.max(0, n.noteCount + delta) } : n)) ?? list);

  function selectNotebook(id: string) {
    if (id !== notebookId) { setNotebookId(id); setNoteId(null); }
    setView('notes');
  }

  const createNotebook = (name: string) => guard(async () => {
    const created = await api.createNotebook(name);
    setNotebooks((list) => [...(list ?? []), created].sort(byName));
    setNotebookId(created.id);
    setNoteId(null);
    setView('notes');
  });

  const renameNotebook = (id: string, name: string) => guard(async () => {
    const updated = await api.renameNotebook(id, name);
    setNotebooks((list) => list?.map((n) => (n.id === id ? { ...n, name: updated.name } : n)).sort(byName) ?? list);
  });

  const deleteNotebook = (nb: Notebook) => guard(async () => {
    const msg = nb.noteCount
      ? `Delete “${nb.name}” and its ${nb.noteCount} note${nb.noteCount === 1 ? '' : 's'}? This cannot be undone.`
      : `Delete “${nb.name}”?`;
    if (!window.confirm(msg)) return;
    await api.deleteNotebook(nb.id);
    const remaining = (notebooks ?? []).filter((n) => n.id !== nb.id);
    setNotebooks(remaining);
    if (nb.id === notebookId) { setNotebookId(remaining[0]?.id ?? null); setNoteId(null); setView('notebooks'); }
  });

  const createNote = () => guard(async () => {
    if (!notebookId) return;
    const created = await api.createNote(notebookId);
    setNotes((list) => [toSummary(created), ...(list ?? [])]);
    adjustCount(notebookId, 1);
    setNoteId(created.id);
    setView('editor');
  });

  // Autosave results only refresh the list entry; they never change which notebook is shown,
  // so a save that lands after switching notebooks is harmless.
  const handleSaved = useCallback((saved: Note) => {
    setNotes((list) => list?.map((n) => (n.id === saved.id ? toSummary(saved) : n)).sort(byRecent) ?? list);
  }, []);

  const handleMoved = useCallback((moved: Note) => {
    if (notebookId) adjustCount(notebookId, -1);
    adjustCount(moved.notebookId, 1);
    setNotes((list) => list?.filter((n) => n.id !== moved.id) ?? list);
    setNoteId(null);
    setView('notes');
  }, [notebookId]);

  const handleDeleted = useCallback((id: string) => {
    setNotes((list) => list?.filter((n) => n.id !== id) ?? list);
    if (notebookId) adjustCount(notebookId, -1);
    setNoteId(null);
    setView('notes');
  }, [notebookId]);

  async function signOut() {
    try {
      await api.logout();
    } catch {
      publishSessionEvent('logout');
    }
    router.replace('/');
    router.refresh();
  }

  const selectedNotebook = notebooks?.find((n) => n.id === notebookId) ?? null;
  const pane = (v: View) => `${view === v ? 'flex' : 'hidden'} min-h-0 lg:flex`;

  return (
    <div className="flex h-dvh flex-col">
      <SessionActivity />
      <header className="flex items-center gap-3 border-b border-line bg-panel px-3 py-2">
        <h1 className="text-base font-bold tracking-tight">Note Taker</h1>
        <span className="flex-1" />
        <span className="hidden max-w-56 truncate text-sm text-muted sm:inline">{user.username}</span>
        <button type="button" className={btn} onClick={() => void signOut()}>Sign out</button>
      </header>

      {notice && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-line bg-hover px-3 py-2 text-sm text-danger">
          <span>{notice}</span>
          <button type="button" className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[16rem_20rem_1fr]">
        <div className={`${pane('notebooks')} flex-col`}>
          <NotebookPane notebooks={notebooks} selectedId={notebookId} onSelect={selectNotebook}
            onCreate={createNotebook} onRename={renameNotebook} onDelete={deleteNotebook} />
        </div>
        <div className={`${pane('notes')} flex-col`}>
          <NoteListPane notebookName={selectedNotebook?.name ?? null} notes={notes} selectedId={noteId}
            onSelect={(id) => { setNoteId(id); setView('editor'); }} onCreate={() => void createNote()} onBack={() => setView('notebooks')} />
        </div>
        <div className={`${pane('editor')} flex-col`}>
          {noteId && notebooks ? (
            <NoteEditor key={noteId} noteId={noteId} notebooks={notebooks} onSaved={handleSaved} onMoved={handleMoved}
              onDeleted={handleDeleted} onBack={() => setView('notes')} />
          ) : (
            <div className="hidden flex-1 items-center justify-center bg-panel p-6 text-center text-sm text-muted lg:flex">
              Select a note, or create a new one.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
