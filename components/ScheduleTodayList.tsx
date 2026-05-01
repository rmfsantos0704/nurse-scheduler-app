// components/ScheduleTodayList.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScheduleCard } from "./ScheduleCard";
import { ScheduleItem } from "../services/scheduleService";
import { isPastDateTime } from "../utils/dateUtils";

interface ScheduleTodayListProps {
  items: ScheduleItem[];
  colors: any;
  onOpenDetail: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (item: ScheduleItem) => void;
  onToggleComplete: (item: ScheduleItem) => void;
  emptyLabel?: string;
}

export function ScheduleTodayList({
  items,
  colors,
  onOpenDetail,
  onEdit,
  onDelete,
  onToggleComplete,
  emptyLabel = "No schedules yet",
}: ScheduleTodayListProps) {
  if (items.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons name="calendar-outline" size={40} color={colors.primary + "66"} />
        <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>{emptyLabel}</Text>
        <TouchableOpacity
          style={[s.emptyBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/add-schedule")}
        >
          <Text style={s.emptyBtnTxt}>Add your first task</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 0 }}>
      {items.map((item, idx) => (
        <TouchableOpacity
          key={`${item._id}-${idx}`}
          onPress={() => onOpenDetail(item)}
          activeOpacity={0.7}
        >
          <ScheduleCard
            item={item}
            isOverdue={!item.isCompleted && isPastDateTime(item.date, item.startTime)}
            onEdit={() => {
              if (!item.isCompleted && !isPastDateTime(item.date, item.startTime)) onEdit(item);
            }}
            onDelete={() => onDelete(item)}
            onToggleComplete={() => onToggleComplete(item)}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  empty:       { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:    { fontSize: 14 },
  emptyBtn:    { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "500" },
});