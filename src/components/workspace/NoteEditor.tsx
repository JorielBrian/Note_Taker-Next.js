'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Note, Notebook } from '@/lib/types';
import { btn, btnDanger, input } from '@/lib/ui';
import { MarkdownPreview } from './MarkdownPreview';

interface Props {
  noteId: string;
  notebooks: Notebook[];
  onSaved: (note: Note) => void;
  onMoved: (note: Note) => void;
  onDeleted: (id: string) => void;
  onBack: () => void;
}

type Status = 'saved' | 'unsaved' | 'saving' | 'error';
const AUTOSAVE_MS = 800;
const STATUS_TEXT: Record<Status, string> = { saved: 'Saved', unsaved: 'Unsaved changes', saving: 'Saving…', error: 'Couldn’t save' };

/** Render with key={noteId} so each note gets fresh state. */
export function NoteEditor({ noteId, notebooks, onSaved, onMoved, onDeleted, onBack }: Props) {
  const [note, setNote] = useState<Note | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [status, setStatus] = useState<Status>('saved');
  const [actionError, setActionError] = useState<string | null>(null);

  const latest = useRef({ title: '', content: '' });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    let cancelled = false;
    api.getNote(noteId)
      .then((n) => {
        if (cancelled) return;
        setNote(n);
        setTitle(n.title);
        setContent(n.content);
        latest.current = { title: n.title, content: n.content };
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => { cancelled = true; };
  }, [noteId]);

  // Saves are serialised so an older request can never overwrite a newer one.
  const flush = useCallback((): Promise<void> => {
    clearTimeout(timer.current);
    if (!dirty.current) return chain.current;
    dirty.current = false;
    const snapshot = { ...latest.current };
    setStatus('saving');
    chain.current = chain.current.then(async () => {
      try {
        onSavedRef.current(await api.updateNote(noteId, snapshot));
        if (!dirty.current) setStatus('saved');
      } catch {
        dirty.current = true;
        setStatus('error');
      }
    });
    return chain.current;
  }, [noteId]);

  useEffect(() => () => { void flush(); }, [flush]); // save pending edits when switching notes

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  function edit(patch: Partial<{ title: string; content: string }>) {
    latest.current = { ...latest.current, ...patch };
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.content !== undefined) setContent(patch.content);
    dirty.current = true;
    setStatus('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }

  async function move(notebookId: string) {
    setActionError(null);
    try {
      await flush();
      onMoved(await api.updateNote(noteId, { notebookId }));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not move note');
    }
  }

  async function remove() {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setActionError(null);
    try {
      clearTimeout(timer.current);
      dirty.current = false;
      await chain.current;
      await api.deleteNote(noteId);
      onDeleted(noteId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete note');
    }
  }

  const header = (
    <div className="flex items-center gap-2 border-b border-line p-3">
      <button type="button" className={`${btn} lg:hidden`} onClick={onBack} aria-label="Back to notes">←</button>
      <span className="flex-1" />
      <span role="status" aria-live="polite" className={`text-xs ${status === 'error' ? 'text-danger' : 'text-muted'}`}>
        {STATUS_TEXT[status]}
      </span>
      {status === 'error' && <button type="button" className={btn} onClick={() => void flush()}>Retry</button>}
    </div>
  );

  if (loadError) {
    return <section aria-label="Editor" className="flex min-h-0 flex-col bg-panel">{header}<p role="alert" className="p-4 text-sm text-danger">{loadError}</p></section>;
  }
  if (!note) {
    return <section aria-label="Editor" className="flex min-h-0 flex-col bg-panel" aria-busy="true">{header}<div className="m-4 h-10 animate-pulse rounded-lg bg-hover" /></section>;
  }

  const tabClass = (t: typeof tab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-selected text-ink' : 'text-muted hover:text-ink'}`;

  return (
    <section aria-label="Editor" className="flex min-h-0 flex-col bg-panel">
      {header}
      <div className="space-y-3 p-3 pb-0">
        <label htmlFor="note-title" className="sr-only">Title</label>
        <input id="note-title" value={title} maxLength={200} placeholder="Untitled"
          onChange={(e) => edit({ title: e.target.value })} className={`${input} text-lg font-semibold sm:text-lg`} />
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Editor mode" className="flex gap-1">
            <button type="button" role="tab" aria-selected={tab === 'write'} className={tabClass('write')} onClick={() => setTab('write')}>Write</button>
            <button type="button" role="tab" aria-selected={tab === 'preview'} className={tabClass('preview')} onClick={() => setTab('preview')}>Preview</button>
          </div>
          <span className="flex-1" />
          <label htmlFor="note-notebook" className="sr-only">Notebook</label>
          <select id="note-notebook" value={note.notebookId} onChange={(e) => void move(e.target.value)} className={`${input} !w-auto max-w-40`}>
            {notebooks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <button type="button" className={btnDanger} onClick={() => void remove()}>Delete</button>
        </div>
        {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
      </div>

      <div className="min-h-0 flex-1 p-3">
        {tab === 'write' ? (
          <>
            <label htmlFor="note-body" className="sr-only">Note content (Markdown)</label>
            <textarea id="note-body" value={content} maxLength={100000} spellCheck
              onChange={(e) => edit({ content: e.target.value })}
              placeholder="Write in Markdown… # Heading, **bold**, - list, `code`"
              className="h-full min-h-64 w-full resize-none rounded-lg border border-line bg-panel p-3 font-mono text-base leading-relaxed text-ink placeholder:text-muted sm:text-sm" />
          </>
        ) : (
          <div className="h-full overflow-y-auto rounded-lg border border-line p-4"><MarkdownPreview source={content} /></div>
        )}
      </div>
    </section>
  );
}
