// components/ScheduleTodayList.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TYPE_COLORS, TYPE_BG } from "../constants/scheduleTypes";
import { ScheduleItem } from "../services/scheduleService";
import { isPastDateTime } from "../utils/dateUtils";
import { useTheme } from "../context/ThemeContext";

type Props = {
  items: ScheduleItem[];
  colors: any;
  onOpenDetail: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (item: ScheduleItem) => void;
  onToggleComplete: (item: ScheduleItem) => void;
  showCompletionAction?: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
};

export function ScheduleTodayList({
  items, colors,
  onOpenDetail, onEdit, onDelete, onToggleComplete,
  showCompletionAction = true,
  selectionMode, selectedIds, onToggleSelect,
}: Props) {
  const { mode } = useTheme();
  const todayStr   = new Date().toISOString().slice(0, 10);
  const todayItems = items
    .filter(i => i.date === todayStr)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  if (todayItems.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons name="calendar-outline" size={36} color={colors.primary + "55"} />
        <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>No schedules for today</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {todayItems.map((item, index) => {
        const isLast     = index === todayItems.length - 1;
        const isOverdue  = !item.isCompleted && isPastDateTime(item.date, item.startTime);
        const isSelected = selectedIds.has(item._id);
        const typeColor  = TYPE_COLORS[item.type] ?? colors.primary;
        const typeBg     = mode === "dark" ? typeColor + "30" : (TYPE_BG[item.type] ?? colors.background);

        const accentColor = isOverdue
          ? "#E24B4A"
          : item.isUrgent && !item.isCompleted
          ? colors.primary
          : typeColor;

        return (
          <TouchableOpacity
            key={item._id}
            activeOpacity={0.75}
            onPress={() => selectionMode ? onToggleSelect(item._id) : onOpenDetail(item)}
            onLongPress={() => onToggleSelect(item._id)}
            delayLongPress={300}
          >
            <View style={[s.row, !isLast && { marginBottom: 6 }]}>

              {/* Checkbox */}
              {selectionMode && (
                <View style={[
                  s.checkbox,
                  {
                    backgroundColor: isSelected ? colors.primary : "transparent",
                    borderColor: isSelected ? colors.primary : colors.textSecondary,
                  },
                ]}>
                  {isSelected && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
              )}

              {/* TIME + LINE */}
              {!selectionMode && (
                <View style={s.timeCol}>
                  <Text style={[
                    s.timeText,
                    { color: item.isCompleted ? colors.textSecondary : accentColor },
                    item.isCompleted && { opacity: 0.5 },
                  ]}>
                    {item.startTime ?? "--:--"}
                  </Text>
                  {!isLast && <View style={[s.line, { backgroundColor: colors.cardBorder }]} />}
                </View>
              )}

              {/* CARD */}
              <View style={[
                s.itemCard,
                { backgroundColor: colors.background, borderColor: colors.cardBorder },
                isOverdue && { borderColor: "#E24B4A", borderWidth: 1 },
                item.isUrgent && !item.isCompleted && !isOverdue && { borderColor: colors.primary, borderWidth: 1 },
                isSelected && { backgroundColor: colors.primary + "12", borderColor: colors.primary },
                item.isCompleted && s.itemDone,
              ]}>
                {/* Accent bar */}
                <View style={[s.accentBar, { backgroundColor: accentColor, opacity: item.isCompleted ? 0.4 : 1 }]} />

                {/* Content */}
                <View style={s.itemContent}>
                  <Text style={[s.itemTitle, { color: colors.textPrimary }, item.isCompleted && s.strikethrough]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={s.tagRow}>
                    <View style={[s.typePill, { backgroundColor: typeBg }]}>
                      <Text style={[s.typePillTxt, { color: typeColor }]}>{item.type}</Text>
                    </View>
                    {isOverdue && (
                      <View style={[s.tag, { backgroundColor: "#FCEBEB", borderColor: "#F4C0C0" }]}>
                        <Text style={[s.tagTxt, { color: "#E24B4A" }]}>Overdue</Text>
                      </View>
                    )}
                    {item.isUrgent && !item.isCompleted && !isOverdue && (
                      <View style={[s.tag, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                        <Text style={[s.tagTxt, { color: colors.primary }]}>Urgent</Text>
                      </View>
                    )}
                    {item.isCompleted && (
                      <View style={[s.tag, { backgroundColor: "#EAF7EE", borderColor: "#A8DDB5" }]}>
                        <Text style={[s.tagTxt, { color: "#2E7D32" }]}>Done</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                {!selectionMode && (
                  <View style={s.actions}>
                    {showCompletionAction && (
                      <TouchableOpacity onPress={() => onToggleComplete(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons
                          name={item.isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                          size={16}
                          color={item.isCompleted ? "#2E7D32" : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => onEdit(item)} disabled={isOverdue || item.isCompleted} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="pencil-outline" size={14} color={isOverdue || item.isCompleted ? colors.textSecondary + "40" : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="trash-outline" size={14} color="#E24B4A" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { borderWidth: 0.5, borderRadius: 14, padding: 10 },
  empty:        { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:     { fontSize: 14 },
  row:          { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  timeCol:      { width: 38, alignItems: "center", paddingTop: 8 },
  timeText:     { fontSize: 10, fontWeight: "600", textAlign: "center" },
  line:         { width: 1, flex: 1, marginTop: 3, minHeight: 12 },
  itemCard:     { flex: 1, flexDirection: "row", borderWidth: 0.5, borderRadius: 8, overflow: "hidden" },
  accentBar:    { width: 3 },
  itemContent:  { flex: 1, paddingHorizontal: 8, paddingVertical: 6, gap: 3 },
  itemDone:     { opacity: 0.55 },
  itemTitle:    { fontSize: 12, fontWeight: "500", flexShrink: 1 },
  strikethrough:{ textDecorationLine: "line-through" },
  tagRow:       { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  tag:          { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  tagTxt:       { fontSize: 9, fontWeight: "500" },
  typePill:     { borderRadius: 20, paddingHorizontal: 5, paddingVertical: 1 },
  typePillTxt:  { fontSize: 9, fontWeight: "500" },
  actions:      { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  checkbox:     { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 8 },
});