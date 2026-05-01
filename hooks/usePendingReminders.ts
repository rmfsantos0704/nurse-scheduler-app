// hooks/usePendingReminders.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";
import { scheduleService } from "../services/scheduleService";
import { scheduleEvents } from "../utils/scheduleEvents";

const POLL_INTERVAL_MS = 30_000; // re-check every 30s as a safety net

export function usePendingReminders() {
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const count = await scheduleService.getPendingUrgentCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // ✅ 1. Re-fetch on tab focus (catches navigation between tabs)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    // ✅ 2. Listen for any schedule mutation fired from anywhere in the app
    scheduleEvents.on("scheduleChanged", refresh);

    // ✅ 3. Re-fetch when app comes back from background
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") refresh();
    });

    // ✅ 4. Poll every 30s as a safety net
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      scheduleEvents.off("scheduleChanged", refresh);
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return pendingCount;
}