import { useState, useCallback } from "react";
import { courseService, Course } from "../services/courseService";

export function useCourses() {
  const [courses, setCourses]     = useState<Course[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const refresh = () => { setRefreshing(true); fetch(); };

  const create = async (body: Omit<Course, "_id">) => {
    const created = await courseService.create(body);
    setCourses(prev => [...prev, created]);
    return created;
  };

  const update = async (id: string, body: Partial<Course>) => {
    const updated = await courseService.update(id, body);
    setCourses(prev => prev.map(c => c._id === updated._id ? updated : c));
    return updated;
  };

  const remove = async (id: string) => {
    setCourses(prev => prev.filter(c => c._id !== id));
    await courseService.remove(id).catch(() => {});
  };

  return { courses, loading, refreshing, fetch, refresh, create, update, remove, setCourses };
}