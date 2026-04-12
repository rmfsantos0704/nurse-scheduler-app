import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const done = await AsyncStorage.getItem("onboardingDone");
      if (!done) {
        // First time user - show onboarding
        router.replace("/onboarding");
      } else {
        // Returning user - go to home
        router.replace("/(tabs)/home");
      }
    } catch (error) {
      // If there's an error, default to onboarding
      console.error("Error checking onboarding:", error);
      router.replace("/onboarding");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF5F8", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#D4537E" size="large" />
    </View>
  );
}
