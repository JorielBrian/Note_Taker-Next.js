import type { NoteSummary } from '@/lib/types';
import { btn, btnPrimary } from '@/lib/ui';

interface Props {
  notebookName: string | null;
  notes: NoteSummary[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onBack: () => void;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function NoteListPane({ notebookName, notes, selectedId, onSelect, onCreate, onBack }: Props) {
  return (
    <section aria-label="Notes" className="flex min-h-0 flex-col border-line bg-panel lg:border-r">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <button type="button" className={`${btn} lg:hidden`} onClick={onBack} aria-label="Back to notebooks">←</button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{notebookName ?? 'Notes'}</h2>
        <button type="button" className={btnPrimary} onClick={onCreate} disabled={!notebookName}>+ New note</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!notebookName ? (
          <p className="p-3 text-sm text-muted">Select or create a notebook first.</p>
        ) : notes === null ? (
          <div className="space-y-2 p-1" aria-busy="true" aria-label="Loading notes">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-hover" />)}
          </div>
        ) : notes.length === 0 ? (
          <p className="p-3 text-sm text-muted">This notebook is empty. Add your first note.</p>
        ) : (
          <ul className="space-y-1">
            {notes.map((n) => {
              const active = n.id === selectedId;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect(n.id)}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${active ? 'bg-selected' : 'hover:bg-hover'}`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{n.title.trim() || 'Untitled'}</span>
                      <span className="shrink-0 text-xs text-muted">{fmt(n.updatedAt)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.snippet.trim() || 'No content'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
