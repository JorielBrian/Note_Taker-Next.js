export interface User { id: string; username: string }
export interface Notebook { id: string; name: string; noteCount: number; createdAt: string; updatedAt: string }
export interface NoteSummary { id: string; notebookId: string; title: string; snippet: string; updatedAt: string }
export interface Note { id: string; notebookId: string; title: string; content: string; createdAt: string; updatedAt: string }
