import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TYPE_COLORS, TYPE_BG } from "../constants/scheduleTypes";
import { useTheme } from "../context/ThemeContext";
import { isPastDateTime } from "../utils/dateUtils";

export function ScheduleCard({
  item,
  onEdit,
  onDelete,
  onToggleComplete,
  isOverdue = false,
}) {
  const { colors } = useTheme();

  // ✅ SAFE FALLBACKS
  const safeType = item.type || "General";
  const safeTitle = item.title || "Untitled";
  const safeTime = item.startTime || "--:--";

  const typeColor = TYPE_COLORS[safeType] || colors.primary;
  const typeBg = TYPE_BG[safeType] || "rgba(0,0,0,0.1)";

  return (
    <View
      style={[
        s.schedItem,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        item.isUrgent && !item.isCompleted && {
          borderColor: colors.primary,
          borderWidth: 1,
        },
        item.isCompleted && s.schedDone,
      ]}
    >
      {/* TIME */}
      <Text
        style={[
          s.schedTime,
          { color: colors.textSecondary },
          item.isUrgent && !item.isCompleted && { color: colors.primary },
        ]}
      >
        {safeTime}
      </Text>

      {/* DOT */}
      <View style={[s.dot, { backgroundColor: typeColor }]} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          
          {/* TITLE */}
          <Text
            style={[s.schedTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {safeTitle}
          </Text>

          {/* TYPE */}
          <View style={[s.typePill, { backgroundColor: typeBg }]}>
            <Text style={[s.typePillTxt, { color: typeColor }]}>
              {safeType}
            </Text>
          </View>

          {/* DONE LATE */}
          {item.isCompleted &&
            item.date &&
            item.startTime &&
            isPastDateTime(item.date, item.startTime) && (
              <View style={s.doneLate}>
                <Text style={s.doneLateText}>Done Late</Text>
              </View>
            )}
        </View>

        {/* DESCRIPTION */}
        {!!item.description && (
          <Text
            style={[s.schedSub, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
      </View>

      {/* ACTIONS */}
      <View style={s.actions}>
        <TouchableOpacity
          onPress={onEdit}
          style={s.actionBtn}
          disabled={isOverdue || item.isCompleted}
        >
          <Ionicons
            name="pencil-outline"
            size={15}
            color={
              isOverdue || item.isCompleted
                ? "#ccc"
                : colors.textSecondary
            }
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} style={s.actionBtn}>
          <Ionicons name="trash-outline" size={15} color="#E24B4A" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleComplete}
          style={[
            s.check,
            { borderColor: colors.primary },
            item.isCompleted && { backgroundColor: colors.primary },
          ]}
        >
          {item.isCompleted && (
            <Ionicons name="checkmark" size={13} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  schedItem: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  schedDone: { opacity: 0.5 },

  schedTime: {
    fontSize: 11,
    fontWeight: "500",
    width: 48,
    textAlign: "center",
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  schedTitle: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },

  schedSub: {
    fontSize: 11,
    marginTop: 1,
  },

  typePill: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  typePillTxt: {
    fontSize: 10,
    fontWeight: "500",
  },

  doneLate: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(255, 152, 0, 0.15)",
  },

  doneLateText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FF9800",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  actionBtn: {
    padding: 4,
  },

  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});