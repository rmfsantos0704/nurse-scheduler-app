import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { formatDate, isPastDateTime, getTypeColor, getTypeBg } from "../../utils/dateUtils";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";
import { SafeScreen } from "../../components/SafeScreen";
import { scheduleService } from "../../services/scheduleService";

type ScheduleItem = {
  _id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  isUrgent?: boolean;
};

export default function Reminders() {
  const { colors, mode } = useTheme();
  const [urgent, setUrgent] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailItem, setDetailItem] = useState<ScheduleItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const openDetail = (item: ScheduleItem) => {
    setDetailItem(item);
    setDetailVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      fetchUrgent();
    }, [])
  );

  const fetchUrgent = async () => {
    try {
      // ── OFFLINE: read from SQLite, filter locally ──
      const all = await scheduleService.getAll();

      const y = new Date().getFullYear();
      const m = String(new Date().getMonth() + 1).padStart(2, "0");
      const d = String(new Date().getDate()).padStart(2, "0");
      const todayStr = `${y}-${m}-${d}`;

      const filtered = all.filter(
        (s) => s.isUrgent && s.date === todayStr
      ) as ScheduleItem[];

      filtered.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });

      setUrgent(filtered);
    } catch (e) {
      console.warn("fetchUrgent error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUrgent();
  };

  const todayItems   = urgent.filter(s => !s.isCompleted && !isPastDateTime(s.date, s.startTime));
  const overdueItems = urgent.filter(s => !s.isCompleted &&  isPastDateTime(s.date, s.startTime));
  const doneItems    = urgent.filter(s => s.isCompleted);

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading reminders...</Text>
      </View>
    );
  }

  return (
    <SafeScreen edges={["top"]}>
      <ScrollView
        style={[s.screen, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Reminders</Text>
            <Text style={[s.pageSub, { color: colors.textSecondary }]}>
              Urgent schedules marked from your homepage
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[s.badgeTxt, { color: colors.primary }]}>
              {urgent.filter(s => !s.isCompleted).length} active
            </Text>
          </View>
        </View>

        {urgent.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No urgent reminders</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>
              Mark a schedule as urgent when adding it from the Home tab to see it here.
            </Text>
            <View style={[s.emptyHint, { backgroundColor: colors.primaryLight, borderColor: colors.cardBorder }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[s.emptyHintTxt, { color: colors.textSecondary }]}>
                Tap the + button on Home → check "Mark as urgent"
              </Text>
            </View>
          </View>
        ) : (
          <>
            {overdueItems.length > 0 && (
              <Section label="Overdue" count={overdueItems.length} countColor="#E24B4A">
                {overdueItems.map(item => (
                  <TouchableOpacity key={item._id} onPress={() => openDetail(item)} activeOpacity={0.8}>
                    <UrgentCard item={item} colors={colors} mode={mode} status="overdue" />
                  </TouchableOpacity>
                ))}
              </Section>
            )}

            {todayItems.length > 0 && (
              <Section label="Today" count={todayItems.length} countColor={colors.primary}>
                {todayItems.map(item => (
                  <TouchableOpacity key={item._id} onPress={() => openDetail(item)} activeOpacity={0.8}>
                    <UrgentCard item={item} colors={colors} mode={mode} status="today" />
                  </TouchableOpacity>
                ))}
              </Section>
            )}

            {doneItems.length > 0 && (
              <Section label="Completed" count={doneItems.length} countColor="#639922">
                {doneItems.map(item => (
                  <TouchableOpacity key={item._id} onPress={() => openDetail(item)} activeOpacity={0.8}>
                    <UrgentCard item={item} colors={colors} mode={mode} status="done" />
                  </TouchableOpacity>
                ))}
              </Section>
            )}
          </>
        )}

        <ScheduleDetailModal
          item={detailItem}
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          colors={colors}
          readOnly={true}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeScreen>
  );
}

function Section({ label, count, countColor, children }: {
  label: string; count: number; countColor: string; children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={s.secRow}>
        <Text style={[s.sec, { color: countColor }]}>{label.toUpperCase()}</Text>
        <View style={[s.countPill, { backgroundColor: countColor + "22" }]}>
          <Text style={[s.countTxt, { color: countColor }]}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function UrgentCard({ item, colors, mode, status }: {
  item: ScheduleItem; colors: any; mode: string;
  status: "overdue" | "today" | "upcoming" | "done";
}) {
  const isOverdue = status === "overdue";
  const isDone    = status === "done";
  const isToday   = status === "today";

  const cardBg = isOverdue
    ? mode === "dark" ? "#2A0808" : "#FCEBEB"
    : isToday
    ? mode === "dark" ? "#1A0D14" : "#FFF5F8"
    : colors.card;

  const borderColor = isOverdue ? "#F09595" : isToday ? colors.primary : colors.cardBorder;

  return (
    <View style={[
      s.card,
      { backgroundColor: cardBg, borderColor, borderWidth: isToday ? 1 : 0.5 },
      isDone && s.cardDone,
    ]}>
      <View style={[s.accentBar, {
        backgroundColor: isOverdue ? "#E24B4A" : isToday ? colors.primary : isDone ? "#639922" : "#378ADD",
      }]} />

      <View style={s.cardBody}>
        <View style={s.cardTopRow}>
          <View style={[s.typePill, { backgroundColor: getTypeBg(item.type) }]}>
            <Text style={[s.typePillTxt, { color: getTypeColor(item.type) }]}>{item.type}</Text>
          </View>

          {isOverdue && (
            <View style={s.overduePill}>
              <Ionicons name="alert-circle" size={11} color="#791F1F" />
              <Text style={s.overdueTxt}>Overdue</Text>
            </View>
          )}
          {isToday && (
            <View style={[s.todayPill, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="today-outline" size={11} color={colors.primary} />
              <Text style={[s.todayTxt, { color: colors.primary }]}>Today</Text>
            </View>
          )}
          {isDone && (
            <View style={s.donePill}>
              <Ionicons name="checkmark-circle" size={11} color="#27500A" />
              <Text style={s.doneTxt}>Done</Text>
            </View>
          )}
        </View>

        <Text style={[s.cardTitle, { color: colors.textPrimary }, isDone && { opacity: 0.5 }]}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={[s.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={s.cardFooter}>
          <View style={s.footerItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.footerTxt, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={s.footerItem}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.footerTxt, { color: colors.textSecondary }]}>{item.startTime}</Text>
          </View>
          {isDone && (
            <Ionicons name="checkmark-circle" size={16} color="#639922" style={{ marginLeft: "auto" }} />
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, padding: 16 },
  loader:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:    { fontSize: 14 },
  headerRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingTop: 8 },
  pageTitle:    { fontSize: 22, fontWeight: "500" },
  pageSub:      { fontSize: 12, marginTop: 3 },
  badge:        { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTxt:     { fontSize: 12, fontWeight: "500" },
  secRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 6 },
  sec:          { fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
  countPill:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  countTxt:     { fontSize: 11, fontWeight: "600" },
  card:         { flexDirection: "row", borderRadius: 14, marginBottom: 10, overflow: "hidden" },
  cardDone:     { opacity: 0.6 },
  accentBar:    { width: 4 },
  cardBody:     { flex: 1, padding: 14 },
  cardTopRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  typePill:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typePillTxt:  { fontSize: 10, fontWeight: "500" },
  overduePill:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F7C1C1", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  overdueTxt:   { fontSize: 10, fontWeight: "500", color: "#791F1F" },
  todayPill:    { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  todayTxt:     { fontSize: 10, fontWeight: "500" },
  donePill:     { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EAF3DE", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  doneTxt:      { fontSize: 10, fontWeight: "500", color: "#27500A" },
  cardTitle:    { fontSize: 15, fontWeight: "500", marginBottom: 4 },
  cardDesc:     { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardFooter:   { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  footerItem:   { flexDirection: "row", alignItems: "center", gap: 4 },
  footerTxt:    { fontSize: 12 },
  emptyWrap:    { alignItems: "center", paddingTop: 60, paddingHorizontal: 24, gap: 12 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:   { fontSize: 18, fontWeight: "500", textAlign: "center" },
  emptySub:     { fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyHint:    { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 0.5, borderRadius: 12, padding: 12, marginTop: 8 },
  emptyHintTxt: { fontSize: 12, flex: 1, lineHeight: 17 },
});