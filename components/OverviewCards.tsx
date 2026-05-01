import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  total: number; done: number; pending: number; overdue: number; pct: number;
  colors: any;
  onPress: (cat: "total" | "done" | "pending" | "overdue") => void;
};

export function OverviewCards({ total, done, pending, overdue, pct, colors, onPress }: Props) {
  const cards = [
    { label: "Total",   value: total,   color: colors.primary, cat: "total",   icon: "list-outline"          },
    { label: "Done",    value: done,    color: "#639922",       cat: "done",    icon: "checkmark-circle-outline" },
    { label: "Pending", value: pending, color: "#BA7517",       cat: "pending", icon: "time-outline"          },
    { label: "Overdue", value: overdue, color: "#E24B4A",       cat: "overdue", icon: "alert-circle-outline"  },
  ] as const;

  return (
    <View>
      <View style={s.row}>
        {cards.map(({ label, value, color, cat, icon }) => (
          <TouchableOpacity
            key={label}
            style={[s.card, { backgroundColor: colors.card, borderColor: color + "55" }]}
            onPress={() => onPress(cat)}
            activeOpacity={0.65}
          >
            {/* Top row: icon + chevron */}
            <View style={s.cardTop}>
              <View style={[s.iconWrap, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Ionicons name="chevron-forward" size={15} color={color + "99"} />
            </View>

            {/* Value */}
            <Text style={[s.num, { color }]}>{value}</Text>

            {/* Label */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.progMeta}>
        <Text style={[s.progLbl, { color: colors.textSecondary }]}>Progress today</Text>
        <Text style={[s.progPct, { color: colors.primary }]}>{pct}%</Text>
      </View>
      <View style={[s.progWrap, { backgroundColor: colors.primaryLight }]}>
        <View style={[s.progBar, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: "row", gap: 8, marginBottom: 10 },
  card:     { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  cardTop:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  iconWrap: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  num:      { fontSize: 20, fontWeight: "600", lineHeight: 22, textAlign: "center" },
  lbl:      { fontSize: 13, marginTop: 1, textAlign: "center" },
  progMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progLbl:  { fontSize: 11 },
  progPct:  { fontSize: 11, fontWeight: "500" },
  progWrap: { height: 6, borderRadius: 6, overflow: "hidden", marginBottom: 18 },
  progBar:  { height: 6, borderRadius: 6 },
});