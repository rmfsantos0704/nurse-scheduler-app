import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, RefreshControl } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useSchedules } from "../../hooks/useSchedule";
import { useProfile } from "../../hooks/useProfile";
import { useNotifications } from "../../hooks/useNotification";
import { useCourses } from "../../hooks/useCourses";
import { useStreak } from "../../hooks/useStreak";
import { OverviewCards } from "../../components/OverviewCards";
import { NextEventCard } from "../../components/NextEventCard";
import { UrgentList } from "../../components/UrgentList";
import { ScheduleCard } from "../../components/ScheduleCard";
import { ScheduleFormModal } from "../../modals/ScheduleFormModal";
import { OverviewModal } from "../../modals/OverviewModal";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";
import { QuoteCard } from "../../components/QuoteCard";
import { WeeklyChart } from "../../components/WeeklyChart";
import { CourseChips } from "../../components/CourseChips";
import { DateStrip } from "../../components/DateStrip";
import { OverdueBanner } from "../../components/OverdueBanner";
import { FAB } from "../../components/FAB";
import { StreakCounter } from "../../components/StreakCounter";
import { scheduleService, ScheduleItem } from "../../services/scheduleService";
import { toTimeString, toDateString, buildDateTime, isPastDateTime } from "../../utils/dateUtils";
import type { ScheduleType } from "../../constants/scheduleTypes";
import { SafeScreen } from "../../components/SafeScreen";

export default function Home() {
  const MASCOT = require("../../assets/images/notification-icon.png");
  const { colors, scheme, mode } = useTheme();
  const { items, loading, refreshing, fetch, refresh, toggleComplete, remove, stats, nextItem, urgentItems } = useSchedules();
  const { profile, load: loadProfile } = useProfile();
  const { granted: notifGranted } = useNotifications();
  const { courses, fetch: fetchCourses } = useCourses();
  const { streak, markDayComplete } = useStreak();

  // ── New navigation / filter state ─────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate,      setSelectedDate]      = useState(todayStr);
  const [selectedCourseId,  setSelectedCourseId]  = useState<string | null>(null);

  // ── Modal / edit state (unchanged) ────────────────────────────────────
  const [overviewVisible, setOverviewVisible] = useState(false);
  const [overviewCat,     setOverviewCat]     = useState<"total"|"done"|"pending"|"overdue"|null>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);
  const [detailItem,      setDetailItem]      = useState<ScheduleItem | null>(null);
  const [editingItem,     setEditingItem]     = useState<ScheduleItem | null>(null);
  const [formVisible,     setFormVisible]     = useState(false);
  const [saving,          setSaving]          = useState(false);

  // Form fields — only used for EDIT
  const [title,            setTitle]            = useState("");
  const [selectedType,     setSelectedType]     = useState<ScheduleType>("Class");
  const [description,      setDescription]      = useState("");
  const [isUrgentForm,     setIsUrgentForm]     = useState(false);
  const [formDate,         setFormDate]         = useState(new Date());
  const [formTime,         setFormTime]         = useState(new Date());
  const [showDatePicker,   setShowDatePicker]   = useState(false);
  const [showTimePicker,   setShowTimePicker]   = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [formCourseId,     setFormCourseId]     = useState<string | null>(null);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useFocusEffect(useCallback(() => {
    fetch();
    loadProfile();
    fetchCourses();
  }, []));

  // ── Auto-mark streak when all today's tasks are done ──────────────────
  useEffect(() => {
    const todayItems = items.filter(i => i.date === todayStr);
    if (todayItems.length > 0 && todayItems.every(i => i.isCompleted)) {
      markDayComplete();
    }
  }, [items]);

  // ── Derived: dates that have items (for DateStrip dots) ───────────────
  const activeDates = useMemo(() => [...new Set(items.map(i => i.date).filter(Boolean))], [items]);

  // ── Derived: overdue count ─────────────────────────────────────────────
  const overdueCount = useMemo(
    () => items.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime)).length,
    [items]
  );

  // ── Filtered items for schedule list ─────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const dateMatch   = item.date === selectedDate;
      const courseMatch = selectedCourseId === null || item.courseId === selectedCourseId;
      return dateMatch && courseMatch;
    });
  }, [items, selectedDate, selectedCourseId]);

  // ── Edit helpers ──────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setSelectedType("Class"); setDescription("");
    setIsUrgentForm(false); setFormDate(new Date()); setFormTime(new Date());
    setReminderTime(new Date()); setShowReminderPicker(false); setFormCourseId(null);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setSelectedType(item.type as ScheduleType);
    setDescription(item.description || "");
    setIsUrgentForm(item.isUrgent || false);
    setReminderTime(item.reminderTime ? buildDateTime(item.date, item.reminderTime) : buildDateTime(item.date, item.startTime));
    setFormCourseId(item.courseId || null);
    if (item.date) {
      const [y, m, d] = item.date.split("-").map(Number);
      setFormDate(new Date(y, m - 1, d));
    }
    if (item.date && item.startTime) setFormTime(buildDateTime(item.date, item.startTime));
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false); setEditingItem(null);
    setShowDatePicker(false); setShowTimePicker(false);
    resetForm();
  };

  const openDetail = (item: ScheduleItem) => { setDetailItem(item); setDetailVisible(true); };

  // ── Update ────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editingItem || !title.trim()) return;
    setSaving(true);
    const timeStr = toTimeString(formTime);
    const dateStr = toDateString(formDate);
    try {
      await scheduleService.update(editingItem._id, {
        title: title.trim(), type: selectedType, date: dateStr,
        startTime: timeStr, description: description.trim(),
        isUrgent: isUrgentForm, courseId: formCourseId,
        reminderMinutesBefore: 0,
        reminderTime: toTimeString(reminderTime),
      });
      await fetch();
      closeForm();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update.");
    } finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = (item: ScheduleItem) => {
    Alert.alert("Delete", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(item._id) },
    ]);
  };

  return (
    <>
      <SafeScreen edges={["top", "bottom"]}>
        <ScrollView
          style={[s.screen, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {/* GREETING ROW */}
          <View style={s.greetRow}>
            <View style={[s.mascotWrap, {
              backgroundColor: mode === "light" ? colors.primaryDark : colors.primaryLight,
            }]}>
              <Image source={MASCOT} style={s.mascot} resizeMode="contain" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[s.greetSub, { color: colors.textSecondary }]}>{greeting},</Text>
              <Text style={[s.greetName, { color: colors.textPrimary }]}>SnowEd</Text>
            </View>

            {/* Streak badge */}
            <StreakCounter colors={colors} streak={streak} />

            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={[s.settingsBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Overdue banner */}
          <OverdueBanner
            count={overdueCount}
            colors={colors}
            onPress={() => { setOverviewCat("overdue"); setOverviewVisible(true); }}
          />

          {/* Quote of the day */}
          <QuoteCard colors={colors} />

          {/* Overview */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Today's overview</Text>
          <OverviewCards
            {...stats}
            colors={colors}
            onPress={cat => { setOverviewCat(cat); setOverviewVisible(true); }}
          />

          {/* Weekly chart */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Weekly activity</Text>
          <WeeklyChart colors={colors} items={items} />

          {/* Next event + Urgent — side by side 2-column layout */}
          {(nextItem || urgentItems.length > 0) && (
            <View style={s.twoColRow}>
              {nextItem && (
                <View style={s.twoColItem}>
                  <Text style={[s.sec, { color: colors.textSecondary }]}>Next up</Text>
                  <NextEventCard item={nextItem} colors={colors} />
                </View>
              )}
              {urgentItems.length > 0 && (
                <View style={s.twoColItem}>
                  <Text style={[s.sec, { color: colors.textSecondary }]}>Needs attention</Text>
                  <UrgentList items={urgentItems} colors={colors} />
                </View>
              )}
            </View>
          )}

          {/* Date strip navigator */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Browse days</Text>
          <DateStrip
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            colors={colors}
            activeDates={activeDates as string[]}
          />

          {/* Course filter chips */}
          {courses.length > 0 && (
            <>
              <Text style={[s.sec, { color: colors.textSecondary }]}>Filter by course</Text>
              <CourseChips
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelect={setSelectedCourseId}
                colors={colors}
              />
            </>
          )}

          {/* Schedule list — filtered by date + course */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Schedule</Text>
          {filteredItems.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.primary + "66"} />
              <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>
                {selectedDate === todayStr ? "No schedules yet" : "Nothing scheduled for this day"}
              </Text>
              <TouchableOpacity
                style={[s.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/add-schedule")}
              >
                <Text style={s.emptyBtnTxt}>Add a task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 0 }}>
              {filteredItems.map((item, idx) => (
                <TouchableOpacity
                  key={`${item._id}-${idx}`}
                  onPress={() => openDetail(item)}
                  activeOpacity={0.7}
                >
                  <ScheduleCard
                    item={item}
                    isOverdue={!item.isCompleted && isPastDateTime(item.date, item.startTime)}
                    onEdit={() => {
                      if (!item.isCompleted && !isPastDateTime(item.date, item.startTime)) openEdit(item);
                    }}
                    onDelete={() => handleDelete(item)}
                    onToggleComplete={() => toggleComplete(item)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick actions — kept minimal since FAB handles add */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Quick actions</Text>
          <View style={s.quickRow}>
            <TouchableOpacity
              style={[s.qBtn, { backgroundColor: colors.card, borderColor: colors.primaryLight }]}
              onPress={refresh}
            >
              <Ionicons name="refresh-outline" size={22} color={colors.primary} />
              <Text style={[s.qBtnTxt, { color: colors.textPrimary }]}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.qBtn, { backgroundColor: colors.card, borderColor: colors.primaryLight }]}
              onPress={() => { setSelectedDate(todayStr); setSelectedCourseId(null); }}
            >
              <Ionicons name="today-outline" size={22} color={colors.primary} />
              <Text style={[s.qBtnTxt, { color: colors.textPrimary }]}>Today</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <FAB onPress={() => router.push("/add-schedule")} color={colors.primary} />
      </SafeScreen>

      {/* Edit modal */}
      <ScheduleFormModal
        visible={formVisible}
        onClose={closeForm}
        onSubmit={handleUpdate}
        editingItem={editingItem}
        saving={saving}
        notifGranted={notifGranted}
        colors={colors}
        title={title} setTitle={setTitle}
        selectedType={selectedType} setSelectedType={setSelectedType}
        description={description} setDescription={setDescription}
        isUrgent={isUrgentForm} setIsUrgent={setIsUrgentForm}
        selectedDate={formDate} setSelectedDate={setFormDate}
        selectedTime={formTime} setSelectedTime={setFormTime}
        showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
        showTimePicker={showTimePicker} setShowTimePicker={setShowTimePicker}
        reminderTime={reminderTime} setReminderTime={setReminderTime}
        showReminderPicker={showReminderPicker} setShowReminderPicker={setShowReminderPicker}
        courses={courses} selectedCourseId={formCourseId} setSelectedCourseId={setFormCourseId}
        toTimeString={toTimeString}
        onDelete={editingItem ? () => { closeForm(); handleDelete(editingItem); } : undefined}
      />

      <OverviewModal
        visible={overviewVisible}
        category={overviewCat}
        items={items}
        colors={colors}
        onClose={() => setOverviewVisible(false)}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggle={toggleComplete}
        onOpenDetail={openDetail}
      />

      <ScheduleDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleComplete={toggleComplete}
        readOnly={false}
      />
    </>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, padding: 16 },
  greetRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, paddingTop: 8 },
  mascotWrap:  { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mascot:      { width: 34, height: 34 },
  settingsBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  greetSub:    { fontSize: 13 },
  greetName:   { fontSize: 20, fontWeight: "500" },
  sec:         { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  twoColRow:   { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  twoColItem:  { flex: 1, minWidth: 0 },
  empty:       { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:    { fontSize: 14 },
  emptyBtn:    { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "500" },
  quickRow:    { flexDirection: "row", gap: 10 },
  qBtn:        { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 14, alignItems: "center", gap: 6 },
  qBtnTxt:     { fontSize: 12, fontWeight: "500" },
});
