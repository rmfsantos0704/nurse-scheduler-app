import { useState, useCallback } from "react";
import { scheduleService, ScheduleItem } from "../services/scheduleService";
import { toDateString, isPastDateTime } from "../utils/dateUtils";
import { cancelNotification } from "../services/NotificationService";

export function useSchedules() {
  const [items, setItems]       = useState<ScheduleItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = toDateString(new Date());

  const fetch = useCallback(async () => {
    try {
      const data = await scheduleService.getByDate(toDateString(new Date()));
      const sorted = data.sort((a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "")
      );
      setItems(sorted);
    } catch (e) {
      console.warn("useSchedules fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = () => { setRefreshing(true); fetch(); };

  const toggleComplete = async (item: ScheduleItem) => {
    const updated = { ...item, isCompleted: !item.isCompleted };
    setItems(prev => prev.map(i => i._id === item._id ? updated : i));
    try {
      await scheduleService.update(item._id, { isCompleted: updated.isCompleted });
      if (updated.isCompleted) await cancelNotification(item._id);
    } catch {
      setItems(prev => prev.map(i => i._id === item._id ? item : i));
    }
  };

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i._id !== id));
    await cancelNotification(id);
    await scheduleService.remove(id).catch(() => {});
  };

  const stats = {
    total:   items.length,
    done:    items.filter(i => i.isCompleted).length,
    pending: items.filter(i => !i.isCompleted && !isPastDateTime(i.date, i.startTime)).length,
    overdue: items.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime)).length,
    pct:     items.length > 0
      ? Math.round(items.filter(i => i.isCompleted).length / items.length * 100)
      : 0,
  };

  const nextItem  = items.find(i => !i.isCompleted);
  const urgentItems = items.filter(i => i.isUrgent && !i.isCompleted);

  return {
    items, loading, refreshing,
    fetch, refresh,
    toggleComplete, remove,
    stats, nextItem, urgentItems,
    setItems,
  };
}