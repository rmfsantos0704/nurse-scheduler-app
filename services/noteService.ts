import { getDb } from "../database/db";
import { generateId } from "../utils/uuid";

export type FormatRange = {
  start: number; end: number;
  bold?: boolean; italic?: boolean;
  underline?: boolean; highlight?: boolean;
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

function rowToNote(row: any): Note {
  return {
    _id:        row.id,
    title:      row.title,
    content:    row.content    ?? "",
    images:     JSON.parse(row.images     ?? "[]"),
    formatting: JSON.parse(row.formatting ?? "[]"),
    createdAt:  row.createdAt,
    updatedAt:  row.updatedAt,
  };
}

export const noteService = {
  getAll: async (): Promise<Note[]> => {
    const db   = getDb();
    const rows = await db.getAllAsync(
      "SELECT * FROM notes ORDER BY updatedAt DESC"
    );
    return rows.map(rowToNote);
  },

  getById: async (id: string): Promise<Note | null> => {
    const db  = getDb();
    const row = await db.getFirstAsync("SELECT * FROM notes WHERE id = ?", [id]);
    return row ? rowToNote(row) : null;
  },

  create: async (data: Omit<Note, "_id" | "createdAt" | "updatedAt">): Promise<Note> => {
    const db  = getDb();
    const id  = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO notes (id, title, content, images, formatting, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?)`,
      [id, data.title, data.content, JSON.stringify(data.images), JSON.stringify(data.formatting), now, now]
    );
    return { ...data, _id: id, createdAt: now, updatedAt: now };
  },

  update: async (id: string, data: Partial<Note>): Promise<Note> => {
    const db  = getDb();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[]    = [];

    if (data.title      !== undefined) { fields.push("title = ?");      values.push(data.title); }
    if (data.content    !== undefined) { fields.push("content = ?");    values.push(data.content); }
    if (data.images     !== undefined) { fields.push("images = ?");     values.push(JSON.stringify(data.images)); }
    if (data.formatting !== undefined) { fields.push("formatting = ?"); values.push(JSON.stringify(data.formatting)); }

    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE notes SET ${fields.join(", ")} WHERE id = ?`, values);

    const row = await db.getFirstAsync("SELECT * FROM notes WHERE id = ?", [id]);
    return rowToNote(row);
  },

  remove: async (id: string): Promise<void> => {
    const db = getDb();
    await db.runAsync("DELETE FROM notes WHERE id = ?", [id]);
  },
};