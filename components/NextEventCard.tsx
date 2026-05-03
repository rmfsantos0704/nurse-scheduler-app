import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleItem } from "../services/scheduleService";

type Props = { item: ScheduleItem | undefined; colors: any };

export function NextEventCard({ item, colors }: Props) {
  if (!item) return null;
  return (
    <View style={[s.card, { borderColor: colors.primary + "30", backgroundColor: colors.card }]}>
      {/* Outer ring */}
      <View style={[s.ring, { borderColor: colors.primary + "25" }]}>
        {/* Inner circle */}
        <View style={[s.circle, { backgroundColor: colors.primary }]}>
          <Ionicons name="time-outline" size={22} color="#fff" />
          <Text style={s.time}>{item.startTime}</Text>
        </View>
      </View>

      {/* Text below the circle */}
      <Text style={[s.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[s.sub, { color: colors.textSecondary }]} numberOfLines={1}>
        {item.description || item.type}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 14,
    marginBottom: 18,
    alignItems: "center",
    gap: 10,
  },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  time:  { fontSize: 14, fontWeight: "700", color: "#fff" },
  title: { fontSize: 15, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  sub:   { fontSize: 12, textAlign: "center" },
});