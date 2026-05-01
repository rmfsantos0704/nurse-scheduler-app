import { View, Text, StyleSheet } from "react-native";

interface StreakCounterProps {
  colors: any;
  streak: number; // number of consecutive days with all tasks completed
}

export function StreakCounter({ colors, streak }: StreakCounterProps) {
  if (streak === 0) return null;

  const label =
    streak === 1 ? "1" : `${streak}`;

  return (
    <View style={[s.wrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={s.fire}>🔥</Text>
      <Text style={[s.label, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  fire:  { fontSize: 14 },
  label: { fontSize: 12, fontWeight: "600" },
});
