import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ScheduleItem = {
  _id: string; 
  title: string; 
  type: string;
  date: string; 
  startTime: string;
  description?: string; 
  isCompleted: boolean;
  completedAt?: string | null; // ✅ Added: ISO string for the turn-in time
  isUrgent?: boolean; 
  courseId?: string | null;
  courseName?: string | null; 
  code?: string; // ✅ Added: Course code for students
  reminderMinutesBefore?: number;
};

const TYPE_COLORS: Record<string, string> = {
  Quiz: "#BA7517", Activity: "rgb(31, 160, 160)", Review: "#7F77DD",
  Class: "#c5cf08", Duty: "#D4537E", Study: "#378ADD", Exam: "#E24B4A", General: "#21a702",
};
const TYPE_BG: Record<string, string> = {
  Quiz: "#FAEEDA", Activity: "#EAF3DE", Review: "#EEEDFE",
  Class: "#E6F1FB", Duty: "#FBEAF0", Study: "#E6F1FB", Exam: "#FCEBEB", General: "#E6F1FB",
};

function formatFullDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function checkIsPast(date: string, startTime: string): boolean {
  try {
    if (!date || !startTime) return false;
    const [y, m, d] = date.split("-").map(Number);
    const cleaned = startTime.replace(/\./g, ":").trim();
    const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return false;
    let h = parseInt(match[1]);
    const min = parseInt(match[2]);
    const ap = match[3]?.toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(y, m - 1, d, h, min) < new Date();
  } catch { return false; }
}

// Add this new helper function or update checkIsPast
function checkIsDoneLate(date: string, startTime: string, completedAt?: string | null): boolean {
  if (!completedAt || !date || !startTime) return false;
  
  try {
    const [y, m, d] = date.split("-").map(Number);
    const cleaned = startTime.replace(/\./g, ":").trim();
    const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return false;
    
    let h = parseInt(match[1]);
    const min = parseInt(match[2]);
    const ap = match[3]?.toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    
    const scheduledDate = new Date(y, m - 1, d, h, min);
    const completionDate = new Date(completedAt);
    
    // Truly late only if completion happened AFTER the scheduled time
    return completionDate > scheduledDate;
  } catch {
    return false;
  }
}

function formatReminder(minutes?: number): string {
  if (minutes === undefined || minutes === null) return "Not set";
  if (minutes === 0)    return "At start time";
  if (minutes === 1440) return "1 day before";
  if (minutes >= 60)    return `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""} before`;
  return `${minutes} min before`;
}

type Props = {
  item: ScheduleItem | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
  onEdit?: (item: ScheduleItem) => void;
  onDelete?: (item: ScheduleItem) => void;
  onToggleComplete?: (item: ScheduleItem) => void;
  readOnly?: boolean;
};

export function ScheduleDetailModal({
  item, visible, onClose, colors,
  onEdit, onDelete, onToggleComplete, readOnly,
}: Props) {
  const hasItem = item !== null && item !== undefined;
  const safeItem = item ?? {} as ScheduleItem;

  const typeColor = hasItem ? (TYPE_COLORS[safeItem.type] || colors.primary) : colors.primary;
  const typeBg    = hasItem ? (TYPE_BG[safeItem.type]    || colors.primaryLight) : colors.primaryLight;
  const isPast    = hasItem ? checkIsPast(safeItem.date, safeItem.startTime) : false;
// ✅ FIX: Use the new logic that respects the completion timestamp[cite: 8]
  const isPastTime = hasItem ? checkIsPast(safeItem.date, safeItem.startTime) : false;
  const doneLate = hasItem ? checkIsDoneLate(safeItem.date, safeItem.startTime, safeItem.completedAt) : false;
  const overdue  = hasItem ? (!safeItem.isCompleted && isPastTime) : false;
  const canEdit   = hasItem ? (!safeItem.isCompleted && !overdue) : false;
  // Status derivation — three completed states: Completed, Done Late, Overdue, Pending
  const statusColor = safeItem.isCompleted
    ? (doneLate ? "#C07A00" : "#639922")
    : overdue ? "#E24B4A" : colors.primary;
  const statusIcon: any = safeItem.isCompleted
    ? (doneLate ? "checkmark-done-circle" : "checkmark-circle")
    : overdue ? "alert-circle" : "time-outline";
  const statusLabel = safeItem.isCompleted
    ? (doneLate ? "Done Late" : "Completed")
    : overdue ? "Overdue — not yet done" : "Pending";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={[ms.sheet, { backgroundColor: colors.background }]}>
          {/* Drag handle */}
          <View style={[ms.handle, { backgroundColor: colors.cardBorder }]} />

          {/* Close button — always visible */}
          <TouchableOpacity onPress={onClose} style={ms.closeBtnAbsolute}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {!hasItem ? (
            <View style={ms.emptyState}>
              <Text style={[ms.emptyTxt, { color: colors.textSecondary }]}>Loading...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* ── TYPE + BADGES ── */}
              <View style={ms.badgeRow}>
                <View style={[ms.typePill, { backgroundColor: typeBg }]}>
                  <Text style={[ms.typePillTxt, { color: typeColor }]}>
                    {safeItem.type || "—"}
                  </Text>
                </View>
                {safeItem.isUrgent && (
                  <View style={[ms.badgePill, { backgroundColor: "#FFF3CD" }]}>
                    <Text style={[ms.badgePillTxt, { color: "#856404" }]}>⚠️ Urgent</Text>
                  </View>
                )}
                {overdue && (
                  <View style={[ms.badgePill, { backgroundColor: "#FCEBEB" }]}>
                    <Text style={[ms.badgePillTxt, { color: "#E24B4A" }]}>Overdue</Text>
                  </View>
                )}
                {doneLate && (
                  <View style={[ms.badgePill, { backgroundColor: "#FFF3CD" }]}>
                    <Text style={[ms.badgePillTxt, { color: "#C07A00" }]}>⏰ Done Late</Text>
                  </View>
                )}
                {safeItem.isCompleted && !doneLate && (
                  <View style={[ms.badgePill, { backgroundColor: "#EAF3DE" }]}>
                    <Text style={[ms.badgePillTxt, { color: "#27500A" }]}>✓ Done</Text>
                  </View>
                )}
              </View>

              {/* ── TITLE ── */}
              <Text style={[ms.title, { color: colors.textPrimary }]}>
                {safeItem.title || "Untitled"}
              </Text>

              {/* ── COLOR ACCENT BAR ── */}
              <View style={[ms.accentBar, { backgroundColor: typeColor }]} />

              {/* ── DATE ── */}
              <InfoCard colors={colors} icon="calendar-outline" label="Date">
                <Text style={[ms.infoValue, { color: colors.textPrimary }]}>
                  {formatFullDate(safeItem.date)}
                </Text>
              </InfoCard>

              {/* ── TIME ── */}
              <InfoCard colors={colors} icon="time-outline" label="Start time">
                <Text style={[ms.infoValue, { color: colors.textPrimary }]}>
                  {safeItem.startTime || "—"}
                </Text>
              </InfoCard>
              
              {/* ── COURSE SECTION ── */}
<InfoCard colors={colors} icon="book-outline" label="Course">
  {safeItem.courseName || safeItem.code ? (
    <View>
      <Text style={[ms.infoValue, { color: colors.textPrimary }]}>
        {/* ✅ Display Code and Name, not the Hex ID */}
        {safeItem.code ? `[${safeItem.code}] ` : ""}
        {safeItem.courseName || "Unnamed Course"}
      </Text>
    </View>
  ) : (
    <Text style={[ms.infoValueMuted, { color: colors.textSecondary }]}>
      No course linked
    </Text>
  )}
</InfoCard>
          
              {/* ── REMINDER ── */}
              <InfoCard colors={colors} icon="alarm-outline" label="Reminder">
                <Text style={[ms.infoValue, { color: colors.textPrimary }]}>
                  {formatReminder(safeItem.reminderMinutesBefore)}
                </Text>
              </InfoCard>

              {/* ── NOTES ── */}
              <InfoCard colors={colors} icon="document-text-outline" label="Notes">
                {safeItem.description ? (
                  <Text style={[ms.infoValue, { color: colors.textPrimary }]}>
                    {safeItem.description}
                  </Text>
                ) : (
                  <Text style={[ms.infoValueMuted, { color: colors.textSecondary }]}>
                    No notes added
                  </Text>
                )}
              </InfoCard>

              {/* ── STATUS ── */}
              <InfoCard
                colors={colors}
                icon={statusIcon}
                label="Status"
                cardBg={
                  safeItem.isCompleted
                    ? (doneLate ? "#FFF8EC" : "#EAF3DE")
                    : overdue ? "#FCEBEB" : undefined
                }
                cardBorder={
                  safeItem.isCompleted
                    ? (doneLate ? "#C07A00" : "#639922")
                    : overdue ? "#E24B4A" : undefined
                }
                iconBg={
                  safeItem.isCompleted
                    ? (doneLate ? "#FFE4A0" : "#C0DD97")
                    : overdue ? "#F7C1C1" : undefined
                }
                iconColor={statusColor}
              >
                <Text style={[ms.infoValue, { color: statusColor }]}>{statusLabel}</Text>
              </InfoCard>

              {/* ── TURNED IN TIMESTAMP ── */}
{safeItem.isCompleted && !!safeItem.completedAt && (
  <InfoCard
    colors={colors}
    icon="checkmark-done-circle-outline"
    label="Turned In"
    cardBg={doneLate ? "#FFF8EC" : "#EAF3DE"}
    cardBorder={doneLate ? "#C07A00" : "#639922"}
    iconBg={doneLate ? "#FFE4A0" : "#C0DD97"}
    iconColor={doneLate ? "#C07A00" : "#639922"}
  >
    <View>
      <Text style={[ms.infoValue, { color: colors.textPrimary }]}>
        {new Date(safeItem.completedAt).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </Text>
      <Text style={[ms.infoValueSmall, { color: colors.textSecondary }]}>
        at{" "}
        {new Date(safeItem.completedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  </InfoCard>
)}
              {/* ── ACTIONS ── */}
              {!readOnly && (
                <>
                  <View style={ms.actionRow}>
                    <TouchableOpacity
                      style={[ms.actionBtn, {
                        backgroundColor: canEdit ? colors.primary : colors.cardBorder,
                        opacity: canEdit ? 1 : 0.45,
                      }]}
                      disabled={!canEdit}
                      onPress={() => { onClose(); setTimeout(() => onEdit?.(safeItem), 300); }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={canEdit ? "#fff" : colors.textSecondary} />
                      <Text style={[ms.actionTxt, { color: canEdit ? "#fff" : colors.textSecondary }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[ms.actionBtn, {
                        backgroundColor: colors.card,
                        borderColor: colors.primary, borderWidth: 1,
                      }]}
                      onPress={() => { onToggleComplete?.(safeItem); onClose(); }}
                    >
                      <Ionicons
                        name={safeItem.isCompleted ? "close-circle-outline" : "checkmark-circle-outline"}
                        size={16} color={colors.primary}
                      />
                      <Text style={[ms.actionTxt, { color: colors.primary }]}>
                        {safeItem.isCompleted ? "Mark undone" : "Mark done"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={ms.deleteBtn}
                    onPress={() => { onClose(); setTimeout(() => onDelete?.(safeItem), 300); }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                    <Text style={ms.deleteTxt}>Delete schedule</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Reusable info card ───────────────────────────────────────────────────────
function InfoCard({
  colors, icon, label, children,
  cardBg, cardBorder, iconBg, iconColor,
}: {
  colors: any; icon: string; label: string; children: React.ReactNode;
  cardBg?: string; cardBorder?: string; iconBg?: string; iconColor?: string;
}) {
  return (
    <View style={[ms.infoCard, {
      backgroundColor: cardBg ?? colors.card,
      borderColor: cardBorder ?? colors.cardBorder,
    }]}>
      <View style={ms.infoRow}>
        <View style={[ms.infoIconWrap, { backgroundColor: iconBg ?? colors.primaryLight }]}>
          <Ionicons name={icon as any} size={16} color={iconColor ?? colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ms.infoLabel, { color: iconColor ?? colors.textSecondary }]}>{label}</Text>
          {children}
        </View>
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  infoValueSmall: { fontSize: 13, color: "#666", marginTop: 2 },
  overlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:            { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingTop: 14, maxHeight: "90%", minHeight: 200 },
  handle:           { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  closeBtnAbsolute: { position: "absolute", top: 18, right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyState:       { paddingVertical: 60, alignItems: "center" },
  emptyTxt:         { fontSize: 14 },
  badgeRow:         { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12, paddingRight: 36 },
  typePill:         { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  typePillTxt:      { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  badgePill:        { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  badgePillTxt:     { fontSize: 11, fontWeight: "600" },
  title:            { fontSize: 22, fontWeight: "700", marginBottom: 10, lineHeight: 28, paddingRight: 36 },
  accentBar:        { height: 3, borderRadius: 2, width: 44, marginBottom: 14 },
  infoCard:         { borderWidth: 0.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  infoRow:          { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIconWrap:     { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel:        { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  infoValue:        { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  infoValueMuted:   { fontSize: 14, fontStyle: "italic" },
  warningBox:       { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  warningTxt:       { fontSize: 13, flex: 1, lineHeight: 19 },
  actionRow:        { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 10 },
  actionBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: 13 },
  actionTxt:        { fontSize: 13, fontWeight: "600" },
  deleteBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12 },
  deleteTxt:        { color: "#E24B4A", fontSize: 13, fontWeight: "500" },
});