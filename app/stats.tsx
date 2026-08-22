import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Dimensions,
} from "react-native";
import { useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useSchedules } from "../hooks/useSchedule";
import { useStreak } from "../hooks/useStreak";
import { WeeklyChart } from "../components/WeeklyChart";
import { SafeScreen } from "../components/SafeScreen";
import { isPastDateTime } from "../utils/dateUtils";

const TYPE_COLOR: Record<string, string> = {
  Quiz:     "#BA7517",
  Activity: "#1FA0A0",
  Review:   "#7F77DD",
  Class:    "#c5cf08",
  Duty:     "#D4537E",
  Study:    "#378ADD",
  Exam:     "#E24B4A",
  General:  "#21a702",
};

const SCREEN_W = Dimensions.get("window").width;

export default function StatsPage() {
  const { colors } = useTheme();
  const { items, fetch } = useSchedules();
  const { streak } = useStreak();

  useFocusEffect(useCallback(() => { fetch(); }, []));

  // ── Date helpers ────────────────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
  }, []);

  // ── This-week boundaries (Mon–Sun) ──────────────────────────────────────
  const { weekStart, weekEnd, weekDays } = useMemo(() => {
    const now  = new Date();
    const day  = now.getDay(); // 0 = Sun
    const diff = day === 0 ? -6 : 1 - day;
    const mon  = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0);
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);   sun.setHours(23,59,59,999);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    }
    return { weekStart: mon, weekEnd: sun, weekDays: days };
  }, []);

  const weekItems = useMemo(
    () => items.filter(i => i.date >= weekDays[0] && i.date <= weekDays[6]),
    [items, weekDays]
  );

  // ── Summary stats ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total     = weekItems.length;
    const done      = weekItems.filter(i => i.isCompleted).length;
    const pending   = weekItems.filter(i => !i.isCompleted).length;
    const overdue   = weekItems.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime)).length;
    const rate      = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pending, overdue, rate };
  }, [weekItems]);

  // ── Busiest day (this week) ─────────────────────────────────────────────
  const busiestDay = useMemo(() => {
    const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const counts = weekDays.map(d => weekItems.filter(i => i.date === d).length);
    const maxIdx = counts.indexOf(Math.max(...counts));
    return counts[maxIdx] > 0 ? DAY_NAMES[maxIdx] : null;
  }, [weekItems, weekDays]);

  // ── Most productive day (most completions ever) ─────────────────────────
  const mostProductiveDay = useMemo(() => {
    const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const tally: Record<number, number> = {};
    items.filter(i => i.isCompleted).forEach(i => {
      const dow = new Date(i.date + "T00:00:00").getDay();
      tally[dow] = (tally[dow] ?? 0) + 1;
    });
    const entries = Object.entries(tally);
    if (entries.length === 0) return null;
    const best = entries.reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a));
    return DAY_NAMES[Number(best[0])];
  }, [items]);

  // ── Busiest upcoming day (future items) ────────────────────────────────
  const busiestUpcoming = useMemo(() => {
    const future = items.filter(i => i.date > todayStr);
    if (future.length === 0) return null;
    const tally: Record<string, number> = {};
    future.forEach(i => { tally[i.date] = (tally[i.date] ?? 0) + 1; });
    const best = Object.entries(tally).reduce((a, b) => (b[1] > a[1] ? b : a));
    const d = new Date(best[0] + "T00:00:00");
    return {
      label: d.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" }),
      count: best[1],
    };
  }, [items, todayStr]);

  // ── Type breakdown (all time) ───────────────────────────────────────────
  const typeBreakdown = useMemo(() => {
    const tally: Record<string, number> = {};
    items.forEach(i => { tally[i.type] = (tally[i.type] ?? 0) + 1; });
    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, color: TYPE_COLOR[type] ?? colors.primary }));
  }, [items]);

  const typeTotal = typeBreakdown.reduce((s, t) => s + t.count, 0);

  return (
    <SafeScreen edges={["top", "bottom"]}>
      <ScrollView
        style={[s.screen, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.pageTitle,    { color: colors.textPrimary }]}>Statistics</Text>
            <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>Your schedule insights</Text>
          </View>
        </View>

        {/* ── Streak + summary row ── */}
        <Text style={[s.sec, { color: colors.textSecondary }]}>This week's overview</Text>
        <View style={s.summaryGrid}>
          {/* Streak card */}
          <View style={[s.streakCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={s.streakEmoji}>🔥</Text>
            <Text style={[s.streakNum, { color: colors.textPrimary }]}>{streak}</Text>
            <Text style={[s.streakLbl, { color: colors.textSecondary }]}>day streak</Text>
          </View>

          {/* Stat tiles */}
          <View style={s.statTiles}>
            {[
              { label: "Total",    value: summary.total,   accent: colors.primary },
              { label: "Done",     value: summary.done,    accent: "#21a702"      },
              { label: "Pending",  value: summary.pending, accent: "#BA7517"      },
              { label: "Overdue",  value: summary.overdue, accent: "#E24B4A"      },
            ].map(t => (
              <View key={t.label} style={[s.tile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[s.tileVal, { color: t.accent }]}>{t.value}</Text>
                <Text style={[s.tileLbl, { color: colors.textSecondary }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Completion rate bar */}
        <View style={[s.rateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={s.rateRow}>
            <Text style={[s.rateLbl, { color: colors.textPrimary }]}>Completion rate</Text>
            <Text style={[s.rateVal, { color: colors.primary }]}>{summary.rate}%</Text>
          </View>
          <View style={[s.rateTrack, { backgroundColor: colors.background }]}>
            <View style={[s.rateFill, { width: `${summary.rate}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[s.rateSub, { color: colors.textSecondary }]}>
            {summary.done} of {summary.total} schedules completed this week
          </Text>
        </View>

        {/* ── Weekly chart ── */}
        <Text style={[s.sec, { color: colors.textSecondary }]}>Weekly activity</Text>
        <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <WeeklyChart colors={colors} items={items} />
        </View>

        {/* ── Insights row ── */}
        <Text style={[s.sec, { color: colors.textSecondary }]}>Insights</Text>
        <View style={s.insightRow}>
          <View style={[s.insightCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="trophy-outline" size={20} color="#BA7517" />
            <Text style={[s.insightTitle, { color: colors.textPrimary }]}>Most productive</Text>
            <Text style={[s.insightVal, { color: colors.primary }]}>
              {mostProductiveDay ?? "—"}
            </Text>
            <Text style={[s.insightSub, { color: colors.textSecondary }]}>most completions ever</Text>
          </View>

          <View style={[s.insightCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="flame-outline" size={20} color="#E24B4A" />
            <Text style={[s.insightTitle, { color: colors.textPrimary }]}>Busiest this week</Text>
            <Text style={[s.insightVal, { color: colors.primary }]}>
              {busiestDay ?? "—"}
            </Text>
            <Text style={[s.insightSub, { color: colors.textSecondary }]}>most items scheduled</Text>
          </View>
        </View>

        {/* Busiest upcoming day */}
        {busiestUpcoming && (
          <View style={[s.upcomingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={s.upcomingLeft}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[s.upcomingTitle, { color: colors.textPrimary }]}>Busiest upcoming day</Text>
                <Text style={[s.upcomingDate,  { color: colors.primary }]}>{busiestUpcoming.label}</Text>
              </View>
            </View>
            <View style={[s.upcomingBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[s.upcomingCount, { color: colors.primary }]}>{busiestUpcoming.count}</Text>
              <Text style={[s.upcomingCountLbl, { color: colors.primary }]}>items</Text>
            </View>
          </View>
        )}

        {/* ── Type breakdown ── */}
        {typeBreakdown.length > 0 && (
          <>
            <Text style={[s.sec, { color: colors.textSecondary }]}>Schedule types</Text>
            <View style={[s.typeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Mini bar chart */}
              <View style={s.typeBarRow}>
                {typeBreakdown.map(t => (
                  <View
                    key={t.type}
                    style={[
                      s.typeBarSegment,
                      {
                        flex: t.count,
                        backgroundColor: t.color,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Legend */}
              <View style={s.typeLegend}>
                {typeBreakdown.map(t => (
                  <View key={t.type} style={s.typeLegendRow}>
                    <View style={[s.typeDot, { backgroundColor: t.color }]} />
                    <Text style={[s.typeLegendName, { color: colors.textPrimary }]}>{t.type}</Text>
                    <View style={[s.typeTrack, { backgroundColor: colors.background }]}>
                      <View
                        style={[
                          s.typeFill,
                          {
                            width: `${Math.round((t.count / typeTotal) * 100)}%` as any,
                            backgroundColor: t.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[s.typeCount, { color: colors.textSecondary }]}>
                      {t.count} · {Math.round((t.count / typeTotal) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, padding: 16 },
  header:           { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 8 },
  backBtn:          { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  pageTitle:        { fontSize: 18, fontWeight: "600" },
  pageSubtitle:     { fontSize: 12, marginTop: 1 },
  sec:              { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 16 },

  // Summary grid
  summaryGrid:      { flexDirection: "row", gap: 10, alignItems: "stretch" },
  streakCard:       { width: 80, borderRadius: 14, borderWidth: 0.5, alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 2 },
  streakEmoji:      { fontSize: 22 },
  streakNum:        { fontSize: 24, fontWeight: "700" },
  streakLbl:        { fontSize: 10, fontWeight: "500" },
  statTiles:        { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile:             { width: "47%", borderRadius: 12, borderWidth: 0.5, paddingVertical: 10, paddingHorizontal: 12 },
  tileVal:          { fontSize: 22, fontWeight: "700" },
  tileLbl:          { fontSize: 10, fontWeight: "500", marginTop: 1 },

  // Rate card
  rateCard:         { borderRadius: 14, borderWidth: 0.5, padding: 14, marginTop: 10 },
  rateRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  rateLbl:          { fontSize: 13, fontWeight: "600" },
  rateVal:          { fontSize: 18, fontWeight: "700" },
  rateTrack:        { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  rateFill:         { height: 8, borderRadius: 4 },
  rateSub:          { fontSize: 11 },

  // Chart card
  chartCard:        { borderRadius: 14, borderWidth: 0.5, padding: 12 },

  // Insights
  insightRow:       { flexDirection: "row", gap: 10 },
  insightCard:      { flex: 1, borderRadius: 14, borderWidth: 0.5, padding: 14, alignItems: "center", gap: 4 },
  insightTitle:     { fontSize: 11, fontWeight: "500", textAlign: "center" },
  insightVal:       { fontSize: 17, fontWeight: "700", textAlign: "center" },
  insightSub:       { fontSize: 10, textAlign: "center" },

  // Upcoming
  upcomingCard:     { borderRadius: 14, borderWidth: 0.5, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  upcomingLeft:     { flexDirection: "row", alignItems: "center", flex: 1 },
  upcomingTitle:    { fontSize: 11, fontWeight: "500" },
  upcomingDate:     { fontSize: 14, fontWeight: "700", marginTop: 2 },
  upcomingBadge:    { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  upcomingCount:    { fontSize: 18, fontWeight: "700" },
  upcomingCountLbl: { fontSize: 10, fontWeight: "500" },

  // Type breakdown
  typeCard:         { borderRadius: 14, borderWidth: 0.5, padding: 14 },
  typeBarRow:       { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 16, gap: 2 },
  typeBarSegment:   { borderRadius: 3 },
  typeLegend:       { gap: 10 },
  typeLegendRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  typeDot:          { width: 8, height: 8, borderRadius: 4 },
  typeLegendName:   { fontSize: 12, fontWeight: "500", width: 60 },
  typeTrack:        { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  typeFill:         { height: 6, borderRadius: 3 },
  typeCount:        { fontSize: 11, width: 60, textAlign: "right" },
});