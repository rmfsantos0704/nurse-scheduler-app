import { View, Text, StyleSheet } from "react-native";
import { ScheduleItem } from "../services/scheduleService";

interface WeeklyChartProps {
  colors: any;
  items: ScheduleItem[]; // all schedule items (not just today)
}

function getLast7Days(): { label: string; dateStr: string; isToday: boolean }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }),
      dateStr: d.toISOString().slice(0, 10),
      isToday: i === 0,
    });
  }
  return days;
}

export function WeeklyChart({ colors, items }: WeeklyChartProps) {
  const days = getLast7Days();

  // Count completed items per day
  const completedByDay: Record<string, number> = {};
  const totalByDay: Record<string, number> = {};

  for (const item of items) {
    if (!item.date) continue;
    totalByDay[item.date] = (totalByDay[item.date] || 0) + 1;
    if (item.isCompleted) {
      completedByDay[item.date] = (completedByDay[item.date] || 0) + 1;
    }
  }

  const maxCompleted = Math.max(1, ...days.map(d => completedByDay[d.dateStr] || 0));
  const BAR_MAX_HEIGHT = 48;

  return (
    <View style={[s.wrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[s.title, { color: colors.textSecondary }]}>This week</Text>
      <View style={s.chart}>
        {days.map(day => {
          const completed = completedByDay[day.dateStr] || 0;
          const total = totalByDay[day.dateStr] || 0;
          const barH = total === 0 ? 4 : Math.max(6, (completed / maxCompleted) * BAR_MAX_HEIGHT);
          const isActive = day.isToday;

          return (
            <View key={day.dateStr} style={s.col}>
              <View style={[s.barBg, { height: BAR_MAX_HEIGHT, backgroundColor: colors.background }]}>
                <View
                  style={[
                    s.bar,
                    {
                      height: barH,
                      backgroundColor: isActive ? colors.primary : colors.primary + "55",
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>
              <Text style={[s.dayLabel, { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? "700" : "400" }]}>
                {day.label}
              </Text>
              {total > 0 && (
                <Text style={[s.count, { color: colors.textSecondary }]}>
                  {completed}/{total}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:     { padding: 14, borderRadius: 14, borderWidth: 0.5, marginBottom: 4 },
  title:    { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 },
  chart:    { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  col:      { alignItems: "center", flex: 1, gap: 4 },
  barBg:    { justifyContent: "flex-end", width: "60%", borderRadius: 4, overflow: "hidden" },
  bar:      { width: "100%" },
  dayLabel: { fontSize: 10 },
  count:    { fontSize: 9 },
});
