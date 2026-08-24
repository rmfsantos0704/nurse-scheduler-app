import { getDb } from "../database/db";
import { generateId } from "../utils/uuid";
import { notifyScheduleChanged } from "../utils/scheduleEvents";
import { cancelNotification } from "./notificationService"; // ← add this import

export type ScheduleItem = {
  _id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string | null;
  isUrgent?: boolean;
  courseId?: string | null;
  reminderMinutesBefore?: number;
  reminderTime?: string | null;
  courseName?: string | null;
  code?: string;
  color?: string;
};

function rowToItem(row: any): ScheduleItem {
  return {
    _id:                   row.id,
    title:                 row.title,
    type:                  row.type,
    date:                  row.date,
    startTime:             row.startTime,
    description:           row.description ?? "",
    isCompleted:           row.isCompleted === 1,
    completedAt:           row.completedAt ?? null,
    isUrgent:              row.isUrgent === 1,
    courseId:              row.courseId ?? null,
    courseName:            row.courseName ?? null,
    code:                  row.courseCode ?? null,
    reminderMinutesBefore: row.reminderMinutesBefore ?? 15,
    reminderTime:          row.reminderTime ?? null,
  };
}

function getTodayString(): string {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const d   = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const scheduleService = {

  // ── READ ──────────────────────────────────────────────────────────────────

  getByDate: async (date: string): Promise<ScheduleItem[]> => {
    const db = getDb();
    const rows = await db.getAllAsync(
      `SELECT s.*, c.name AS courseName, c.code AS courseCode
       FROM schedules s
       LEFT JOIN courses c ON s.courseId = c.id
       WHERE s.date = ?
       ORDER BY s.startTime ASC`,
      [date]
    );
    return rows.map(rowToItem);
  },

  getAll: async (): Promise<ScheduleItem[]> => {
    const db = getDb();
    const rows = await db.getAllAsync(
      `SELECT s.*, c.name AS courseName, c.code AS courseCode
       FROM schedules s
       LEFT JOIN courses c ON s.courseId = c.id
       ORDER BY s.date ASC, s.startTime ASC`
    );
    return rows.map(rowToItem);
  },

  getPendingUrgentCount: async (): Promise<number> => {
    const db = getDb();
    const today = getTodayString();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM schedules
       WHERE isUrgent = 1
         AND isCompleted = 0
         AND date = ?`,
      [today]
    );
    return row?.count ?? 0;
  },

  // ── WRITE ─────────────────────────────────────────────────────────────────

  create: async (data: Omit<ScheduleItem, "_id">): Promise<ScheduleItem> => {
    const db  = getDb();
    const id  = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO schedules
        (id, title, type, date, startTime, description,
         isCompleted, completedAt, isUrgent, courseId,
         reminderMinutesBefore, reminderTime, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        data.title,
        data.type,
        data.date,
        data.startTime,
        data.description           ?? "",
        data.isCompleted           ? 1 : 0,
        data.completedAt           ?? null,
        data.isUrgent              ? 1 : 0,
        data.courseId              ?? null,
        data.reminderMinutesBefore ?? 15,
        data.reminderTime         ?? null,
        now,
        now,
      ]
    );

    notifyScheduleChanged();
    return { ...data, _id: id };
  },

  update: async (id: string, data: Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const db  = getDb();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[]    = [];

    if (data.title                 !== undefined) { fields.push("title = ?");               values.push(data.title); }
    if (data.type                  !== undefined) { fields.push("type = ?");                values.push(data.type); }
    if (data.date                  !== undefined) { fields.push("date = ?");                values.push(data.date); }
    if (data.startTime             !== undefined) { fields.push("startTime = ?");           values.push(data.startTime); }
    if (data.description           !== undefined) { fields.push("description = ?");         values.push(data.description); }
    if (data.isUrgent              !== undefined) { fields.push("isUrgent = ?");            values.push(data.isUrgent ? 1 : 0); }
    if (data.courseId              !== undefined) { fields.push("courseId = ?");            values.push(data.courseId); }
    if (data.reminderMinutesBefore !== undefined) {
      fields.push("reminderMinutesBefore = ?");
      values.push(data.reminderMinutesBefore);
    }
    if (data.reminderTime !== undefined) {
      fields.push("reminderTime = ?");
      values.push(data.reminderTime);
    }

    if (data.isCompleted !== undefined) {
      fields.push("isCompleted = ?");
      values.push(data.isCompleted ? 1 : 0);

      fields.push("completedAt = ?");
      values.push(
        data.isCompleted
          ? (data.completedAt ?? new Date().toISOString())
          : null
      );
    }

    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE schedules SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    notifyScheduleChanged();

    const row = await db.getFirstAsync("SELECT * FROM schedules WHERE id = ?", [id]);
    return rowToItem(row);
  },

  // ✅ THE FIX: cancel the notification before deleting from DB
  remove: async (id: string): Promise<void> => {
    await cancelNotification(id); // ← cancels any pending notification for this schedule
    const db = getDb();
    await db.runAsync("DELETE FROM schedules WHERE id = ?", [id]);
    notifyScheduleChanged();
  },
};