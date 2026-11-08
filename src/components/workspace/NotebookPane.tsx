'use client';

import { useState } from 'react';
import type { Notebook } from '@/lib/types';
import { btn, btnPrimary, input } from '@/lib/ui';

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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
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

  function toggleMenu(id: string, button: HTMLButtonElement) {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    setMenuPosition({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    setOpenMenuId(id);
  }

  return (
    <section aria-label="Notebooks" className="flex min-h-0 flex-col border-line bg-panel lg:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-line p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Notebooks</h2>
        <button type="button" className={btn} onClick={() => { setCreating(true); setRenamingId(null); setOpenMenuId(null); setMenuPosition(null); setName(''); }}>
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
              const renaming = renamingId === nb.id;
              const menuOpen = openMenuId === nb.id;
              return (
                <li key={nb.id}>
                  {renaming ? (
                    <form
                      className="space-y-2 rounded-lg bg-selected p-2"
                      onSubmit={(e) => { e.preventDefault(); void run(() => onRename(nb.id, name), () => setRenamingId(null)); }}
                    >
                      <label htmlFor={`rename-notebook-${nb.id}`} className="sr-only">Rename notebook</label>
                      <input id={`rename-notebook-${nb.id}`} autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={input} />
                      <div className="flex gap-2">
                        <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>Save</button>
                        <button type="button" className={btn} onClick={() => setRenamingId(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className={`flex min-h-11 items-center gap-1 rounded-lg text-sm transition-colors ${
                      active ? 'bg-selected font-semibold' : 'hover:bg-hover'
                    }`}>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => { setOpenMenuId(null); setMenuPosition(null); onSelect(nb.id); }}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left"
                      >
                        <span className="truncate">{nb.name}</span>
                        <span className="shrink-0 text-xs text-muted">{nb.noteCount}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`More actions for ${nb.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={(e) => toggleMenu(nb.id, e.currentTarget)}
                        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                          <circle cx="12" cy="5" r="1.7" />
                          <circle cx="12" cy="12" r="1.7" />
                          <circle cx="12" cy="19" r="1.7" />
                        </svg>
                      </button>
                      {menuOpen && menuPosition && (
                        <div
                          role="menu"
                          aria-label={`Actions for ${nb.name}`}
                          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, transform: 'translateY(-50%)' }}
                          className="z-50 min-w-36 rounded-lg border border-line bg-panel p-1 shadow-xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-hover"
                            onClick={() => { setName(nb.name); setRenamingId(nb.id); setOpenMenuId(null); setMenuPosition(null); setCreating(false); }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-hover"
                            onClick={() => { setOpenMenuId(null); setMenuPosition(null); void onDelete(nb); }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
