import { API_URL } from "../constants/apiUrl";

export type FormatRange = {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
};

export type Note = {
  _id: string;
  title: string;
  content: string;
  images: string[];
  formatting: FormatRange[];
  createdAt: string;
  updatedAt: string;
};

export const noteService = {
  getAll: async (): Promise<Note[]> => {
    const res = await fetch(`${API_URL}/notes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

getById: async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/notes/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
},
  

  create: async (body: Omit<Note, "_id" | "createdAt" | "updatedAt">): Promise<Note> => {
    const res = await fetch(`${API_URL}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  update: async (id: string, body: Partial<Note>): Promise<Note> => {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  remove: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
  },
};