import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type Props = {
  total: number; done: number; pending: number; overdue: number; pct: number;
  colors: any;
  onPress: (cat: "total" | "done" | "pending" | "overdue") => void;
};

export function OverviewCards({ total, done, pending, overdue, pct, colors, onPress }: Props) {
  const cards = [
    { label: "Total",   value: total,   color: colors.primary, cat: "total"   },
    { label: "Done",    value: done,    color: "#639922",       cat: "done"    },
    { label: "Pending", value: pending, color: "#BA7517",       cat: "pending" },
    { label: "Overdue", value: overdue, color: "#E24B4A",       cat: "overdue" },
  ] as const;

  return (
    <View>
      <View style={s.row}>
        {cards.map(({ label, value, color, cat }) => (
          <TouchableOpacity
            key={label}
            style={[s.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onPress(cat)}
            activeOpacity={0.7}
          >
            <Text style={[s.num, { color }]}>{value}</Text>
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
  row:      { flexDirection: "row", gap: 10, marginBottom: 10 },
  card:     { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 12, alignItems: "center" },
  num:      { fontSize: 22, fontWeight: "500" },
  lbl:      { fontSize: 11, marginTop: 4 },
  progMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progLbl:  { fontSize: 11 },
  progPct:  { fontSize: 11, fontWeight: "500" },
  progWrap: { height: 6, borderRadius: 6, overflow: "hidden", marginBottom: 18 },
  progBar:  { height: 6, borderRadius: 6 },
});