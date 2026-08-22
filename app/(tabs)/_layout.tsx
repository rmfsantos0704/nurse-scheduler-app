// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { BubbleNav } from "../../components/BubbleNav";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown:     false,
          tabBarStyle:     { display: "none" },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen name="home"       options={{ title: "Home"       }} />
        <Tabs.Screen name="courses"    options={{ title: "Courses"    }} />
        <Tabs.Screen name="calendar"   options={{ title: "Calendar"   }} />
        <Tabs.Screen name="reminders"  options={{ title: "Reminders"  }} />
        <Tabs.Screen name="notes"      options={{ title: "Notes"      }} />
        <Tabs.Screen name="research"   options={{ title: "Research"   }} />
      </Tabs>

      <BubbleNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});