import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScheduleCard } from "../components/ScheduleCard";
import { isPastDateTime } from "../utils/dateUtils";
import type { ScheduleItem } from "../services/scheduleService";

type Category = "total" | "done" | "pending" | "overdue";

type Props = {
  visible: boolean;
  category: Category | null;
  items: ScheduleItem[];
  colors: any;
  onClose: () => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (item: ScheduleItem) => void;
  onToggle: (item: ScheduleItem) => void;
  onOpenDetail: (item: ScheduleItem) => void;
};

const TITLES: Record<Category, string> = {
  total:   "All schedules",
  done:    "Completed tasks",
  pending: "Pending tasks",
  overdue: "Overdue tasks",
};

export function OverviewModal({
  visible, category, items, colors,
  onClose, onEdit, onDelete, onToggle, onOpenDetail,
}: Props) {
  if (!category) return null;

  const filtered = {
    total:   items,
    done:    items.filter(i => i.isCompleted),
    pending: items.filter(i => !i.isCompleted && !isPastDateTime(i.date, i.startTime)),
    overdue: items.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime)),
  }[category];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.overlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
        <View style={[s.sheet, { backgroundColor: colors.background }]}>
          <View style={s.header}>
            <Text style={[s.title, { color: colors.textPrimary }]}>{TITLES[category]}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="list-outline" size={40} color={colors.textSecondary} />
                <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>Nothing here</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {filtered.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item._id}-${idx}`}
                    onPress={() => { onClose(); setTimeout(() => onOpenDetail(item), 300); }}
                    activeOpacity={0.7}
                  >
                    <ScheduleCard
                      item={item}
                      isOverdue={category === "overdue"}
                      onEdit={() => { onClose(); setTimeout(() => onEdit(item), 300); }}
                      onDelete={() => { onClose(); setTimeout(() => onDelete(item), 300); }}
                      onToggleComplete={() => onToggle(item)}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:   { fontSize: 18, fontWeight: "500" },
  empty:   { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:{ fontSize: 14 },
});