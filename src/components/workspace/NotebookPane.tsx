'use client';

import { useState } from 'react';
import type { Notebook } from '@/lib/types';
import { btn, btnDanger, btnPrimary, input } from '@/lib/ui';

interface Props {
  notebooks: Notebook[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (notebook: Notebook) => Promise<void>;
}

export function NotebookPane({ notebooks, selectedId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, done: () => void) {
    setBusy(true);
    try {
      await action();
      done();
    } finally {
      setBusy(false);
    }
  }

  const selected = notebooks?.find((n) => n.id === selectedId) ?? null;

  return (
    <section aria-label="Notebooks" className="flex min-h-0 flex-col border-line bg-panel lg:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-line p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Notebooks</h2>
        <button type="button" className={btn} onClick={() => { setCreating(true); setRenaming(false); setName(''); }}>
          + New
        </button>
      </div>

      {creating && (
        <form
          className="space-y-2 border-b border-line p-3"
          onSubmit={(e) => { e.preventDefault(); void run(() => onCreate(name), () => setCreating(false)); }}
        >
          <label htmlFor="new-notebook" className="sr-only">Notebook name</label>
          <input id="new-notebook" autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
            className={input} placeholder="Notebook name" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>Create</button>
            <button type="button" className={btn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {notebooks === null ? (
          <div className="space-y-2 p-1" aria-busy="true" aria-label="Loading notebooks">
            {[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-hover" />)}
          </div>
        ) : notebooks.length === 0 ? (
          <p className="p-3 text-sm text-muted">No notebooks yet. Create one to start taking notes.</p>
        ) : (
          <ul className="space-y-1">
            {notebooks.map((nb) => {
              const active = nb.id === selectedId;
              return (
                <li key={nb.id}>
                  {active && renaming ? (
                    <form
                      className="space-y-2 rounded-lg bg-selected p-2"
                      onSubmit={(e) => { e.preventDefault(); void run(() => onRename(nb.id, name), () => setRenaming(false)); }}
                    >
                      <label htmlFor="rename-notebook" className="sr-only">Rename notebook</label>
                      <input id="rename-notebook" autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={input} />
                      <div className="flex gap-2">
                        <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>Save</button>
                        <button type="button" className={btn} onClick={() => setRenaming(false)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => onSelect(nb.id)}
                      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
                        active ? 'bg-selected font-semibold' : 'hover:bg-hover'
                      }`}
                    >
                      <span className="truncate">{nb.name}</span>
                      <span className="shrink-0 text-xs text-muted">{nb.noteCount}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && !renaming && (
        <div className="flex gap-2 border-t border-line p-3">
          <button type="button" className={`${btn} flex-1`} onClick={() => { setRenaming(true); setCreating(false); setName(selected.name); }}>
            Rename
          </button>
          <button type="button" className={`${btnDanger} flex-1`} onClick={() => void onDelete(selected)}>
            Delete
          </button>
        </div>
      )}
    </section>
  );
}
