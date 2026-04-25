import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ThemeProvider, useTheme } from "../context/ThemeContext";



function RootLayoutNav() {
  const { colors } = useTheme();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const done = await AsyncStorage.getItem("onboardingDone");
      if (!done) {
        router.replace("/onboarding");
      }
    } catch {
      // If storage fails, proceed to tabs
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)"       options={{ gestureEnabled: false }} />
      <Stack.Screen name="onboarding"   options={{ gestureEnabled: false }} />
      <Stack.Screen name="settings"     options={{ presentation: "card" }} />
      <Stack.Screen name="note-editor"  options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="month-schedules" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
    </Stack>
  );
}
export default function RootLayout() {
  return (
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
  );
}