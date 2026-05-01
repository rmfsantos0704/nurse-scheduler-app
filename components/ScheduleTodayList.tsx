// components/ScheduleTodayList.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScheduleCard } from "./ScheduleCard";
import { ScheduleItem } from "../services/scheduleService";
import { isPastDateTime } from "../utils/dateUtils";

type Props = {
  items: ScheduleItem[];
  colors: any;
  onOpenDetail: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (item: ScheduleItem) => void;
  onToggleComplete: (id: string) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
};

export function ScheduleTodayList({
  items, colors,
  onOpenDetail, onEdit, onDelete, onToggleComplete,
  selectionMode, selectedIds, onToggleSelect,
}: Props) {
  const todayStr   = new Date().toISOString().slice(0, 10);
  const todayItems = items.filter(i => i.date === todayStr);

  if (todayItems.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons name="calendar-outline" size={36} color={colors.primary + "55"} />
        <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>No schedules for today</Text>
      </View>
    );
  }

  return (
    <View>
      {todayItems.map(item => {
        const isOverdue  = !item.isCompleted && isPastDateTime(item.date, item.startTime);
        const isSelected = selectedIds.has(item._id);

        return (
          // ✅ Outer wrapper handles ALL taps in both modes
          <TouchableOpacity
            key={item._id}
            activeOpacity={0.75}
            onPress={() => selectionMode ? onToggleSelect(item._id) : onOpenDetail(item)}
            onLongPress={() => onToggleSelect(item._id)}
            delayLongPress={300}
          >
            {/* ✅ Row wraps checkbox + card side by side — no overlap/clipping */}
            <View style={[
              s.row,
              isSelected && { backgroundColor: colors.primary + "12", borderRadius: 12 },
            ]}>

              {/* Checkbox — only rendered in selection mode */}
              {selectionMode && (
                <View style={[
                  s.checkbox,
                  {
                    backgroundColor: isSelected ? colors.primary : "transparent",
                    borderColor:     isSelected ? colors.primary : colors.textSecondary,
                  },
                ]}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              )}

              {/* Card — fills remaining space; actions disabled in selection mode */}
              <View style={{ flex: 1 }}>
                <ScheduleCard
                  item={item}
                  onEdit={selectionMode ? () => {} : () => onEdit(item)}
                  onDelete={selectionMode ? () => {} : () => onDelete(item)}
                  onToggleComplete={selectionMode ? () => {} : () => onToggleComplete(item._id)}
                  isOverdue={isOverdue}
                />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  empty:    { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt: { fontSize: 14 },
  // ✅ Checkbox and card sit side by side in a row — no absolute positioning
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    paddingLeft: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});