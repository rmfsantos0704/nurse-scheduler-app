import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync("snowed.db");
  }
  return _db;
}

export async function initDb(): Promise<void> {
  const db = getDb();

  // ✅ FIX 1: Run PRAGMA separately — mixing it with CREATE TABLE in one
  // execAsync block silently hangs on production EAS builds (expo-sqlite v2).
  await db.execAsync(`PRAGMA journal_mode = WAL;`);

  // ✅ FIX 2: Split each CREATE TABLE into its own execAsync call.
  // A single multi-statement string can stall when one statement is slow
  // to resolve on device, causing the loading screen to freeze forever.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schedules (
      id                    TEXT PRIMARY KEY,
      title                 TEXT NOT NULL,
      type                  TEXT NOT NULL DEFAULT 'General',
      date                  TEXT NOT NULL,
      startTime             TEXT NOT NULL,
      description           TEXT DEFAULT '',
      isCompleted           INTEGER DEFAULT 0,
      completedAt           TEXT,
      isUrgent              INTEGER DEFAULT 0,
      courseId              TEXT,
      reminderMinutesBefore INTEGER DEFAULT 15,
      createdAt             TEXT DEFAULT (datetime('now')),
      updatedAt             TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS courses (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      code      TEXT DEFAULT '',
      instructor TEXT DEFAULT '',
      room      TEXT DEFAULT '',
      color     TEXT DEFAULT '#378ADD',
      timeslots TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id        TEXT PRIMARY KEY,
      title     TEXT NOT NULL DEFAULT 'Untitled',
      content   TEXT DEFAULT '',
      images    TEXT DEFAULT '[]',
      formatting TEXT DEFAULT '[]',
      courseId  TEXT,
      color     TEXT DEFAULT '#378ADD',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  // ✅ FIX 3: Wrap each migration in its own try/catch so one failure
  // does not prevent the rest of initDb from completing.
  try {
    const scheduleColumns: any[] = await db.getAllAsync("PRAGMA table_info(schedules)");
    const hasCompletedAt = scheduleColumns.some(col => col.name === "completedAt");
    if (!hasCompletedAt) {
      await db.execAsync("ALTER TABLE schedules ADD COLUMN completedAt TEXT;");
      console.log("Migration: added completedAt column.");
    }
  } catch (e) {
    console.error("Migration (completedAt) failed:", e);
  }

  try {
    const noteColumns: any[] = await db.getAllAsync("PRAGMA table_info(notes)");
    const columnNames = new Set(noteColumns.map(column => column.name));
    if (!columnNames.has("images")) {
      await db.execAsync("ALTER TABLE notes ADD COLUMN images TEXT DEFAULT '[]';");
      console.log("Migration: added notes.images column.");
    }
    if (!columnNames.has("formatting")) {
      await db.execAsync("ALTER TABLE notes ADD COLUMN formatting TEXT DEFAULT '[]';");
      console.log("Migration: added notes.formatting column.");
    }
  } catch (e) {
    console.error("Migration (note fields) failed:", e);
  }
}