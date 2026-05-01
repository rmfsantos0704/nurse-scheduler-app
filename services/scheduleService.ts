import { getDb } from "../database/db";
import { generateId } from "../utils/uuid";
import { toDateString } from "../utils/dateUtils";

export type ScheduleItem = {
  _id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string | null; // ISO string — set when marked complete
  isUrgent?: boolean;
  courseId?: string | null;
  reminderMinutesBefore?: number;
  courseName?: string | null; // Joined from courses table
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
    // ✅ NEW: Map the joined columns from the SQL query
    courseName:            row.courseName ?? null,
    code:                  row.courseCode ?? null, 
    reminderMinutesBefore: row.reminderMinutesBefore ?? 15,
  };
}

export const scheduleService = {
  getByDate: async (date: string): Promise<ScheduleItem[]> => {
    const db = getDb();
    // ✅ JOIN with courses table to get name and code instead of just ID
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
    // ✅ Apply the same JOIN here for the month-schedules view
    const rows = await db.getAllAsync(
      `SELECT s.*, c.name AS courseName, c.code AS courseCode 
       FROM schedules s 
       LEFT JOIN courses c ON s.courseId = c.id 
       ORDER BY s.date ASC, s.startTime ASC`
    );
    return rows.map(rowToItem);
  },

  create: async (data: Omit<ScheduleItem, "_id">): Promise<ScheduleItem> => {
    const db  = getDb();
    const id  = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO schedules
        (id, title, type, date, startTime, description,
         isCompleted, completedAt, isUrgent, courseId, reminderMinutesBefore, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        data.title,
        data.type,
        data.date,
        data.startTime,
        data.description ?? "",
        data.isCompleted ? 1 : 0,
        data.completedAt ?? null,
        data.isUrgent    ? 1 : 0,
        data.courseId    ?? null,
        data.reminderMinutesBefore ?? 15,
        now, now,
      ]
    );
    return { ...data, _id: id };
  },

 update: async (id: string, data: Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const db  = getDb();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[]    = [];

    if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
    if (data.type !== undefined) { fields.push("type = ?"); values.push(data.type); }
    if (data.date !== undefined) { fields.push("date = ?"); values.push(data.date); }
    if (data.startTime !== undefined) { fields.push("startTime = ?"); values.push(data.startTime); }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
    if (data.isUrgent !== undefined) { fields.push("isUrgent = ?"); values.push(data.isUrgent ? 1 : 0); }
    if (data.courseId !== undefined) { fields.push("courseId = ?"); values.push(data.courseId); }
    if (data.reminderMinutesBefore !== undefined) {
      fields.push("reminderMinutesBefore = ?");
      values.push(data.reminderMinutesBefore);
    }

    // ✅ FIXED: Handle isCompleted and completedAt in sync
    if (data.isCompleted !== undefined) {
      fields.push("isCompleted = ?");
      values.push(data.isCompleted ? 1 : 0);
      
      fields.push("completedAt = ?");
      // Use provided completedAt (from the hook) or generate a fallback
      const timestamp = data.isCompleted ? (data.completedAt ?? new Date().toISOString()) : null;
      values.push(timestamp);
    }

    fields.push("updatedAt = ?");
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE schedules SET ${fields.join(", ")} WHERE id = ?`, values);
    const row = await db.getFirstAsync("SELECT * FROM schedules WHERE id = ?", [id]);
    return rowToItem(row);
  },

  remove: async (id: string): Promise<void> => {
    const db = getDb();
    await db.runAsync("DELETE FROM schedules WHERE id = ?", [id]);
  },
};