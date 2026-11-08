'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type MenuPosition = { top: number; left: number };

export function NotebookPane({ notebooks, selectedId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeMenuNotebook = notebooks?.find((notebook) => notebook.id === openMenuId) ?? null;

  useEffect(() => {
    if (!openMenuId) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const trigger = triggerRefs.current.get(openMenuId!);
      if (menuRef.current?.contains(target) || trigger?.contains(target)) return;
      setOpenMenuId(null);
      setMenuPosition(null);
    }

    function closeMenu() {
      setOpenMenuId(null);
      setMenuPosition(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    // Close on scroll rather than letting a detached popover remain over unrelated content.
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [openMenuId]);

  async function run(action: () => Promise<void>, done: () => void) {
    setBusy(true);
    try {
      await action();
      done();
    } finally {
      setBusy(false);
    }
  }

  function toggleMenu(notebookId: string) {
    if (openMenuId === notebookId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const trigger = triggerRefs.current.get(notebookId);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 88;
    const gap = 8;
    const placeRight = rect.right + gap + menuWidth <= window.innerWidth;
    const left = placeRight ? rect.right + gap : Math.max(8, rect.left - menuWidth - gap);
    const top = Math.min(Math.max(8, rect.top - 4), window.innerHeight - menuHeight - 8);

    setMenuPosition({ top, left });
    setOpenMenuId(notebookId);
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
                        ref={(node) => {
                          if (node) triggerRefs.current.set(nb.id, node);
                          else triggerRefs.current.delete(nb.id);
                        }}
                        type="button"
                        aria-label={`More actions for ${nb.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={() => toggleMenu(nb.id)}
                        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                          <circle cx="12" cy="5" r="1.7" />
                          <circle cx="12" cy="12" r="1.7" />
                          <circle cx="12" cy="19" r="1.7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeMenuNotebook && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${activeMenuNotebook.name}`}
          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: 144, zIndex: 1000 }}
          className="rounded-lg border border-line bg-panel p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-hover"
            onClick={() => {
              setName(activeMenuNotebook.name);
              setRenamingId(activeMenuNotebook.id);
              setOpenMenuId(null);
              setMenuPosition(null);
              setCreating(false);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-hover"
            onClick={() => {
              const notebook = activeMenuNotebook;
              setOpenMenuId(null);
              setMenuPosition(null);
              void onDelete(notebook);
            }}
          >
            Delete
          </button>
        </div>,
        document.body,
      )}
    </section>
  );
}
