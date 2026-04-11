import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
shouldShowBanner: true, shouldShowList: true,   
}), });

// Type icons shown in the notification body
const TYPE_EMOJI: Record<string, string> = {
  Quiz:     "📝",
  Activity: "⚡",
  Review:   "📖",
  Class:    "🏫",
  Duty:     "🏥",
  Study:    "📚",
  Exam:     "📋",
};

const TYPE_LABEL: Record<string, string> = {
  Quiz:     "Quiz",
  Activity: "Activity",
  Review:   "Review session",
  Class:    "Class",
  Duty:     "Hospital duty",
  Study:    "Study session",
  Exam:     "Exam",
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
    // Default channel
    await Notifications.setNotificationChannelAsync("nursesched_default", {
      name: "NurseSched — General",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4537E",
      sound: "default",
    });

    // Urgent channel
    await Notifications.setNotificationChannelAsync("nursesched_urgent", {
      name: "NurseSched — Urgent",
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

  await Notifications.setNotificationChannelAsync("nursesched_default", {
    name: "NurseSched — General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: hex,
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("nursesched_urgent", {
    name: "NurseSched — Urgent",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: hex,
    sound: "default",
    bypassDnd: true,
  });
}

// ─── Main schedule notification ───────────────────────────────────────────────
export async function scheduleActivityNotification(
  id: string,
  title: string,
  type: string,
  description: string,
  dateTime: Date,
  isUrgent: boolean,
  scheme: string
): Promise<void> {
  const now = new Date();
  if (dateTime <= now) return;

  await cancelNotification(id);
  await applySchemeToChannels(scheme);

  const emoji    = TYPE_EMOJI[type]  ?? "📌";
  const typeLabel = TYPE_LABEL[type] ?? type;
  const channel  = isUrgent ? "nursesched_urgent" : "nursesched_default";

  const timeStr = dateTime.toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });
  const dateStr = dateTime.toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric",
  });

  // ── AT-TIME notification ────────────────────────────────────────────────────
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `${emoji} ${isUrgent ? "⚠️ URGENT — " : ""}${title}`,
      body: [
        `${typeLabel} · ${timeStr}`,
        dateStr,
        description ? `📍 ${description}` : null,
        isUrgent ? "This is marked as urgent — don't miss it!" : null,
      ]
        .filter(Boolean)
        .join("\n"),
      sound: true,
      badge: 1,
      data: { scheduleId: id, type, isUrgent },
      ...(Platform.OS === "android" && {
        channelId: channel,
        color: SCHEME_COLOR[scheme] ?? "#D4537E",
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dateTime,
    },
  });

  // ── 15-MIN early warning ────────────────────────────────────────────────────
  const earlyTime = new Date(dateTime.getTime() - 15 * 60 * 1000);
  if (earlyTime > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${id}_early`,
      content: {
        title: `⏳ Starting soon: ${title}`,
        body: [
          `${typeLabel} starts at ${timeStr}`,
          description ? `📍 ${description}` : null,
          "Get ready — 15 minutes to go!",
        ]
          .filter(Boolean)
          .join("\n"),
        sound: true,
        data: { scheduleId: id, type, isUrgent },
        ...(Platform.OS === "android" && {
          channelId: channel,
          color: SCHEME_COLOR[scheme] ?? "#D4537E",
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: earlyTime,
      },
    });
  }

  // ── 1-HOUR early warning (urgent only) ─────────────────────────────────────
  if (isUrgent) {
    const hourEarly = new Date(dateTime.getTime() - 60 * 60 * 1000);
    if (hourEarly > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${id}_1hr`,
        content: {
          title: `⚠️ Urgent reminder: ${title}`,
          body: [
            `${typeLabel} at ${timeStr}`,
            dateStr,
            description ? `📍 ${description}` : null,
            "1 hour remaining — prepare now.",
          ]
            .filter(Boolean)
            .join("\n"),
          sound: true,
          data: { scheduleId: id, type, isUrgent },
          ...(Platform.OS === "android" && {
            channelId: "nursesched_urgent",
            color: SCHEME_COLOR[scheme] ?? "#D4537E",
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: hourEarly,
        },
      });
    }
  }
}

// ─── Cancel all notifications for a schedule ─────────────────────────────────
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`${id}_early`).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`${id}_1hr`).catch(() => {});
}