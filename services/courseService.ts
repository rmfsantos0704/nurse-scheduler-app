import { API_URL } from "../constants/apiUrl";

export type Course = {
  _id: string; name: string; code: string;
  instructor: string; room: string; color: string;
  timeslots: { day: string; startTime: string; endTime: string }[];
};

export const courseService = {
  getAll: async (): Promise<Course[]> => {
    const res = await fetch(`${API_URL}/courses`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  getWithSchedules: async (id: string) => {
    const res = await fetch(`${API_URL}/courses/${id}/schedules`);
    return res.json();
  },

  create: async (body: Omit<Course, "_id">): Promise<Course> => {
    const res = await fetch(`${API_URL}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  update: async (id: string, body: Partial<Course>): Promise<Course> => {
    const res = await fetch(`${API_URL}/courses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  remove: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/courses/${id}`, { method: "DELETE" });
  },
};