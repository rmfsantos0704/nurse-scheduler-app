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

  // 1. Standard initialization
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS schedules (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'General',
      date        TEXT NOT NULL,
      startTime   TEXT NOT NULL,
      description TEXT DEFAULT '',
      isCompleted INTEGER DEFAULT 0,
      completedAt TEXT,
      isUrgent    INTEGER DEFAULT 0,
      courseId    TEXT,
      reminderMinutesBefore INTEGER DEFAULT 15,
      createdAt   TEXT DEFAULT (datetime('now')),
      updatedAt   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      code        TEXT DEFAULT '',
      instructor  TEXT DEFAULT '',
      room        TEXT DEFAULT '',
      color       TEXT DEFAULT '#378ADD',
      timeslots   TEXT DEFAULT '[]',
      createdAt   TEXT DEFAULT (datetime('now'))
    );
  `);

  // 2. MIGRATION: Manually add the column if it's missing from the existing table
  try {
    const tableInfo: any[] = await db.getAllAsync("PRAGMA table_info(schedules)");
    const hasCompletedAt = tableInfo.some(column => column.name === 'completedAt');
    
    if (!hasCompletedAt) {
      await db.execAsync("ALTER TABLE schedules ADD COLUMN completedAt TEXT;");
      console.log("Migration: added completedAt column successfully.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
}