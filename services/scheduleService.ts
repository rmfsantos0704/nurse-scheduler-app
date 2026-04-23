import { API_URL } from "../constants/apiUrl";

export type ScheduleItem = {
  _id: string; title: string; type: string;
  date: string; startTime: string;
  description?: string; isCompleted: boolean;
  isUrgent?: boolean; courseId?: string | null;
  reminderMinutesBefore?: number;
};

export const scheduleService = {
  getByDate: async (date: string): Promise<ScheduleItem[]> => {
    const res = await fetch(`${API_URL}/schedules/${date}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  getAll: async (): Promise<ScheduleItem[]> => {
    const res = await fetch(`${API_URL}/schedules`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  create: async (body: Omit<ScheduleItem, "_id">): Promise<ScheduleItem> => {
    const res = await fetch(`${API_URL}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  update: async (id: string, body: Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const res = await fetch(`${API_URL}/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  remove: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/schedules/${id}`, { method: "DELETE" });
  },
};