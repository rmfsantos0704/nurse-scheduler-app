import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleItem } from "../services/scheduleService";

type Props = { item: ScheduleItem | undefined; colors: any };

export function NextEventCard({ item, colors }: Props) {
  if (!item) return null;
  return (
    <View style={[s.card, { backgroundColor: colors.primary }]}>
      <View style={s.topRow}>
        <View style={[s.ico, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Ionicons name="time-outline" size={23} color="#fff" />
        </View>
        <View style={[s.badge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={s.badgeTxt}>{item.startTime}</Text>
        </View>
      </View>
      <Text style={s.title} numberOfLines={2}>{item.title}</Text>
      <Text style={s.sub} numberOfLines={1}>{item.description || item.type}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card:     { borderRadius: 14, padding: 12, marginBottom: 18, gap: 6 },
  topRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  ico:      { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 18, fontWeight: "600", color: "#fff", lineHeight: 18 },
  sub:      { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  badge:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 15, color: "#fff" },
});