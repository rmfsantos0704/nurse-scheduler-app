import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleItem } from "../services/scheduleService";

type Props = { item: ScheduleItem | undefined; colors: any };

export function NextEventCard({ item, colors }: Props) {
  if (!item) return null;
  return (
    <View style={[s.card, { backgroundColor: colors.primary }]}>
      <View style={[s.ico, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
        <Ionicons name="time-outline" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.sub}>{item.description || item.type}</Text>
      </View>
      <View style={s.badge}>
        <Text style={s.badgeTxt}>{item.startTime}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:     { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  ico:      { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 15, fontWeight: "500", color: "#fff" },
  sub:      { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  badge:    { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, color: "#fff" },
});