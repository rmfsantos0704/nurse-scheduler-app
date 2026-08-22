import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const TYPE_LABEL: Record<string, string> = {
  Quiz:     "Quiz",
  Activity: "Activity",
  Review:   "Review session",
  Class:    "Class",
  Duty:     "Hospital duty",
  Study:    "Study session",
  Exam:     "Exam",
  General:  "General",
};

// Type colors — matches the app's schedule type palette
const TYPE_COLOR: Record<string, string> = {
  Quiz:     "#BA7517",
  Activity: "#1FA0A0",
  Review:   "#7F77DD",
  Class:    "#c5cf08",
  Duty:     "#D4537E",
  Study:    "#378ADD",
  Exam:     "#E24B4A",
  General:  "#21a702",
};

// Map color scheme name → hex (mirrors ThemeContext)
const SCHEME_COLOR: Record<string, string> = {
  pink:   "#D4537E",
  blue:   "#378ADD",
  purple: "#7F77DD",
  teal:   "#1D9E75",
  green:  "#639922",
};

export async function registerForPushNotifications(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("SnowEd_default", {
      name: "SnowEd — General",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4537E",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("SnowEd_urgent", {
      name: "SnowEd — Urgent",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: "#E24B4A",
      sound: "default",
      bypassDnd: true,
    });
  }

  return true;
}

// ─── Re-register channels with the user's chosen color ───────────────────────
export async function applySchemeToChannels(scheme: string): Promise<void> {
  if (Platform.OS !== "android") return;
  const hex = SCHEME_COLOR[scheme] ?? "#D4537E";

  await Notifications.setNotificationChannelAsync("SnowEd_default", {
    name: "SnowEd — General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: hex,
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("SnowEd_urgent", {
    name: "SnowEd — Urgent",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: hex,
    sound: "default",
    bypassDnd: true,
  });
}

// ─── Schedule a single reminder notification ──────────────────────────────────
export async function scheduleActivityNotification(
  id: string,
  title: string,
  type: string,
  description: string,
  triggerDate: Date,
  isUrgent: boolean,
  scheme: string,
  eventTime: Date        // the actual event start time (not the trigger offset)
): Promise<void> {
  const now = new Date();
  if (triggerDate <= now) return;

  await cancelNotification(id);
  await applySchemeToChannels(scheme);

  const typeLabel = TYPE_LABEL[type] ?? type;
  const typeColor = TYPE_COLOR[type] ?? SCHEME_COLOR[scheme] ?? "#D4537E";
  const channel   = isUrgent ? "SnowEd_urgent" : "SnowEd_default";

  const timeStr = eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = eventTime.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `${isUrgent ? "URGENT — " : ""}${title}`,
      body: [
        `${typeLabel} · ${timeStr}`,
        dateStr,
        description ? `${description}` : null,
        isUrgent ? "This is marked as urgent — don't miss it!" : null,
      ]
        .filter(Boolean)
        .join("\n"),
      sound: true,
      badge: 1,
      data: { scheduleId: id, type, isUrgent },
      ...(Platform.OS === "android" && {
        channelId: channel,
        color: typeColor,
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

// ─── Cancel the notification for a schedule ───────────────────────────────────
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}