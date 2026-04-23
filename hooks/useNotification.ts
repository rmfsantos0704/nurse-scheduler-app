import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "../services/NotificationService";

export function useNotifications() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    registerForPushNotifications().then(setGranted);
    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, []);

  return { granted };
}