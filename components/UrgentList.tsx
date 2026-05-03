import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleItem } from "../services/scheduleService";

type Props = { items: ScheduleItem[]; colors: any };

export function UrgentList({ items, colors }: Props) {
  if (!items.length) return null;
  return (
    <View>
      {items.map((item, idx) => (
        <View key={`${item._id}-${idx}`} style={s.card}>
          <Ionicons name="warning-outline" size={18} color="#BA7517" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: "#633806" }]}>{item.title}</Text>
            <Text style={[s.sub, { color: "#854F0B" }]}>
              {item.description || item.type} · {item.startTime}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card:  { backgroundColor: "#FAEEDA", borderWidth: 0.5, borderColor: "#FAC775", borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  title: { fontSize: 13, fontWeight: "500" },
  sub:   { fontSize: 12, marginTop: 2 },
});