import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "snowed_streak";
const LAST_DATE_KEY = "snowed_streak_last_date";

/**
 * Records whether today's tasks were all completed and returns the current streak.
 * Call `markDayComplete()` when all tasks for today are done.
 */
export function useStreak() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadStreak();
  }, []);

  const today = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const loadStreak = async () => {
    try {
      const [storedStreak, lastDate] = await Promise.all([
        AsyncStorage.getItem(STREAK_KEY),
        AsyncStorage.getItem(LAST_DATE_KEY),
      ]);

      const currentStreak = storedStreak ? parseInt(storedStreak, 10) : 0;
      const todayStr = today();

      if (!lastDate) {
        setStreak(0);
        return;
      }

      // If last marked date is today, streak is current
      if (lastDate === todayStr) {
        setStreak(currentStreak);
        return;
      }

      // If last marked date was yesterday, streak is still valid (just not marked today yet)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (lastDate === yesterdayStr) {
        setStreak(currentStreak);
        return;
      }

      // Streak broken — gap of more than 1 day
      await AsyncStorage.setItem(STREAK_KEY, "0");
      setStreak(0);
    } catch (e) {
      console.error("useStreak loadStreak:", e);
    }
  };

  /**
   * Call this when all of today's tasks are completed.
   * Increments streak only once per day.
   */
  const markDayComplete = async () => {
    try {
      const todayStr = today();
      const lastDate = await AsyncStorage.getItem(LAST_DATE_KEY);

      // Already marked today
      if (lastDate === todayStr) return;

      const storedStreak = await AsyncStorage.getItem(STREAK_KEY);
      const currentStreak = storedStreak ? parseInt(storedStreak, 10) : 0;

      // Check if yesterday was marked (continue streak) or not (reset to 1)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const newStreak = lastDate === yesterdayStr ? currentStreak + 1 : 1;

      await Promise.all([
        AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
        AsyncStorage.setItem(LAST_DATE_KEY, todayStr),
      ]);

      setStreak(newStreak);
    } catch (e) {
      console.error("useStreak markDayComplete:", e);
    }
  };

  return { streak, markDayComplete };
}