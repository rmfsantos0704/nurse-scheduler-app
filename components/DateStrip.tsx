import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";

interface DateStripProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelect: (date: string) => void;
  colors: any;
  /** Dates that have at least one schedule item — used to show a dot indicator */
  activeDates?: string[];
}

function getNext7Days(): { label: string; dayNum: string; dateStr: string; isToday: boolean }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }),
      dayNum: String(d.getDate()),
      dateStr: d.toISOString().slice(0, 10),
      isToday: i === 0,
    });
  }
  return days;
}

export function DateStrip({ selectedDate, onSelect, colors, activeDates = [] }: DateStripProps) {
  const days = getNext7Days();
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {days.map(day => {
        const isSelected = selectedDate === day.dateStr;
        const hasItems = activeDates.includes(day.dateStr);

        return (
          <TouchableOpacity
            key={day.dateStr}
            onPress={() => onSelect(day.dateStr)}
            activeOpacity={0.75}
            style={[
              s.cell,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text style={[s.dayLabel, { color: isSelected ? "#fff" : colors.textSecondary }]}>
              {day.isToday ? "Today" : day.label}
            </Text>
            <Text style={[s.dayNum, { color: isSelected ? "#fff" : colors.textPrimary }]}>
              {day.dayNum}
            </Text>
            {hasItems && (
              <View style={[s.dot, { backgroundColor: isSelected ? "#ffffff88" : colors.primary }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: "row", gap: 8, paddingBottom: 4 },
  cell:     { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 0.5, minWidth: 60, gap: 2 },
  dayLabel: { fontSize: 10, fontWeight: "500" },
  dayNum:   { fontSize: 17, fontWeight: "600" },
  dot:      { width: 5, height: 5, borderRadius: 3 },
});
