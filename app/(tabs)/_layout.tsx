// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePendingReminders } from "../../hooks/usePendingReminders"; // 👈

function HomeTabIcon({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        hts.wrap,
        { backgroundColor: focused ? colors.primary : colors.card },
        focused && hts.wrapActive,
      ]}
    >
      {focused && (
        <View style={[hts.ring, { borderColor: colors.primary + "40" }]} />
      )}
      <Ionicons
        name={focused ? "home" : "home-outline"}
        size={26}
        color={focused ? "#fff" : colors.tabBarInactive}
      />
    </View>
  );
}

const hts = StyleSheet.create({
  wrap: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 14 : 22,
    borderWidth: 3, borderColor: "#fff",
    elevation: 6, shadowColor: "#000",
    shadowOpacity: 0.15, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  wrapActive: { elevation: 10, shadowOpacity: 0.3 },
  ring: {
    position: "absolute", width: 70, height: 70,
    borderRadius: 35, borderWidth: 2,
  },
});

export default function TabLayout() {
  const { colors } = useTheme();
  const pendingCount = usePendingReminders(); // ✅ Auto-refreshes on tab focus

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          elevation: 8,
          height: Platform.OS === "ios" ? 88 : 80,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined, // ✅
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}