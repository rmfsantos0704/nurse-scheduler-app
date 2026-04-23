import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const done = await AsyncStorage.getItem("onboardingDone");
      // Don't redirect here - just check and allow router to handle it
    } catch (error) {
      console.error("Error checking onboarding:", error);
    } finally {
      // Add a small delay to let theme context initialize
      setTimeout(() => setChecking(false), 100);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF5F8", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#D4537E" size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding"  options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)"      options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings"    options={{ presentation: "card" }} />
        <Stack.Screen name="note-editor" options={{ headerShown: false, animation: "slide_from_right" }} />
      </Stack>
    </ThemeProvider>
  );
}