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

export async function registerForPushNotifications(): Promise<boolean> {
  // Only request permission for local notifications — no push token needed
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "NurseSched Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4537E",
    });
  }

  // ✅ NO push token fetch — local notifications only
  return true;
}

export async function scheduleActivityNotification(
  id: string,
  title: string,
  description: string,
  dateTime: Date
): Promise<void> {
  const now = new Date();
  if (dateTime <= now) return;

  await cancelNotification(id);

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `⏰ ${title}`,
      body: description || "Your scheduled activity is starting now.",
      sound: true,
      data: { scheduleId: id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dateTime,
    },
  });

  // 15-min early warning
  const earlyTime = new Date(dateTime.getTime() - 15 * 60 * 1000);
  if (earlyTime > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${id}_early`,
      content: {
        title: `📋 Coming up: ${title}`,
        body: "Starts in 15 minutes — get ready!",
        sound: true,
        data: { scheduleId: id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: earlyTime,
      },
    });
  }
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`${id}_early`).catch(() => {});
}