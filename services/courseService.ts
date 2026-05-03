import { getDb } from "../database/db";
import { generateId } from "../utils/uuid";

export type Course = {
  _id: string;
  name: string;
  code: string;
  instructor: string;
  room: string;
  color: string;
  timeslots: { day: string; startTime: string; endTime: string }[];
};

function rowToCourse(row: any): Course {
  return {
    _id:       row.id,
    name:      row.name,
    code:      row.code      ?? "",
    instructor:row.instructor?? "",
    room:      row.room      ?? "",
    color:     row.color     ?? "#378ADD",
    timeslots: JSON.parse(row.timeslots ?? "[]"),
  };
}

export const courseService = {
  getAll: async (): Promise<Course[]> => {
    const db   = getDb();
    const rows = await db.getAllAsync("SELECT * FROM courses ORDER BY name ASC");
    return rows.map(rowToCourse);
  },

  getWithSchedules: async (id: string) => {
    const db        = getDb();
    const courseRow = await db.getFirstAsync("SELECT * FROM courses WHERE id = ?", [id]);
    const schedRows = await db.getAllAsync(
      "SELECT * FROM schedules WHERE courseId = ? ORDER BY date ASC, startTime ASC",
      [id]
    );
    return {
      course:    courseRow ? rowToCourse(courseRow) : null,
      schedules: schedRows.map((r: any) => ({
        _id:         r.id,
        title:       r.title,
        type:        r.type,
        date:        r.date,
        startTime:   r.startTime,
        description: r.description,
        isCompleted: r.isCompleted === 1,
        isUrgent:    r.isUrgent === 1,
        courseId:    r.courseId,
      })),
    };
  },

  create: async (data: Omit<Course, "_id">): Promise<Course> => {
    const db  = getDb();
    const id  = generateId();
    await db.runAsync(
      `INSERT INTO courses (id, name, code, instructor, room, color, timeslots)
       VALUES (?,?,?,?,?,?,?)`,
      [id, data.name, data.code, data.instructor, data.room, data.color, JSON.stringify(data.timeslots)]
    );
    return { ...data, _id: id };
  },

  update: async (id: string, data: Partial<Course>): Promise<Course> => {
    const db     = getDb();
    const fields: string[] = [];
    const values: any[]    = [];

    if (data.name       !== undefined) { fields.push("name = ?");       values.push(data.name); }
    if (data.code       !== undefined) { fields.push("code = ?");       values.push(data.code); }
    if (data.instructor !== undefined) { fields.push("instructor = ?"); values.push(data.instructor); }
    if (data.room       !== undefined) { fields.push("room = ?");       values.push(data.room); }
    if (data.color      !== undefined) { fields.push("color = ?");      values.push(data.color); }
    if (data.timeslots  !== undefined) { fields.push("timeslots = ?");  values.push(JSON.stringify(data.timeslots)); }

    values.push(id);
    await db.runAsync(`UPDATE courses SET ${fields.join(", ")} WHERE id = ?`, values);

    const row = await db.getFirstAsync("SELECT * FROM courses WHERE id = ?", [id]);
    return rowToCourse(row);
  },

  remove: async (id: string): Promise<void> => {
    const db = getDb();
    await db.runAsync("DELETE FROM courses WHERE id = ?", [id]);
    // Unlink schedules from this course
    await db.runAsync("UPDATE schedules SET courseId = NULL WHERE courseId = ?", [id]);
  },
};