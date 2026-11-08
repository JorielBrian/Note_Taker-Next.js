import type { Note, NoteSummary, Notebook, User } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const AUTH_PATHS = ['/auth/login', '/auth/register'];

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    // Session expired or invalid: clear the cookie and go back to the login page.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/');
    throw new ApiError(401, 'Your session has expired');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new ApiError(res.status, message ?? 'Something went wrong. Please try again.');
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  register: (username: string, password: string) => request<User>('/auth/register', { method: 'POST', json: { username, password } }),
  login: (username: string, password: string) => request<User>('/auth/login', { method: 'POST', json: { username, password } }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  listNotebooks: () => request<Notebook[]>('/notebooks'),
  createNotebook: (name: string) => request<Notebook>('/notebooks', { method: 'POST', json: { name } }),
  renameNotebook: (id: string, name: string) => request<Notebook>(`/notebooks/${id}`, { method: 'PATCH', json: { name } }),
  deleteNotebook: (id: string) => request<void>(`/notebooks/${id}`, { method: 'DELETE' }),

  listNotes: (notebookId: string) => request<NoteSummary[]>(`/notebooks/${notebookId}/notes`),
  createNote: (notebookId: string) => request<Note>(`/notebooks/${notebookId}/notes`, { method: 'POST', json: {} }),
  getNote: (id: string) => request<Note>(`/notes/${id}`),
  updateNote: (id: string, changes: Partial<Pick<Note, 'title' | 'content' | 'notebookId'>>) =>
    request<Note>(`/notes/${id}`, { method: 'PATCH', json: changes }),
  deleteNote: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
};
