import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDb } from "../database/db";

function RootLayoutNav() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    bootstrap();
  }, []);

  // ✅ FIX: Navigate only after the Stack is mounted (ready = true).
  // Calling router.replace() before setReady(true) means the Stack
  // screens aren't registered yet, so the redirect silently fails and
  // the app stays on the loading screen forever.
  useEffect(() => {
    if (ready && redirect) {
      router.replace(redirect as any);
    }
  }, [ready, redirect]);

  const bootstrap = async () => {
    try {
      // initDb() is the only place the DB should be initialized.
      // Do NOT call it again inside onboarding's finish() function.
      await initDb();

      const done = await AsyncStorage.getItem("onboardingDone");
      if (!done) {
        setRedirect("/onboarding");
      }
    } catch (e) {
      console.warn("Bootstrap error:", e);
    } finally {
      setReady(true);
    }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)"          options={{ gestureEnabled: false }} />
      <Stack.Screen name="onboarding"      options={{ gestureEnabled: false }} />
      <Stack.Screen name="settings"        options={{ presentation: "card" }} />
      <Stack.Screen name="note-editor"     options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="about"           options={{ headerShown: false }} />
      <Stack.Screen name="month-schedules" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}