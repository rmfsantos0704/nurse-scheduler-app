import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, RefreshControl } from "react-native";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useSchedules } from "../../hooks/useSchedule";
import { useProfile } from "../../hooks/useProfile";
import { useNotifications } from "../../hooks/useNotification";
import { useCourses } from "../../hooks/useCourses";
import { OverviewCards } from "../../components/OverviewCards";
import { NextEventCard } from "../../components/NextEventCard";
import { UrgentList } from "../../components/UrgentList";
import { ScheduleCard } from "../../components/ScheduleCard";
import { ScheduleFormModal } from "../../modals/ScheduleFormModal";
import { OverviewModal } from "../../modals/OverviewModal";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";
import { scheduleService, ScheduleItem } from "../../services/scheduleService";
import { scheduleActivityNotification } from "../../services/NotificationService";
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

  // Only edit modal remains — create now goes to /add-schedule page
  const [overviewVisible, setOverviewVisible] = useState(false);
  const [overviewCat,     setOverviewCat]     = useState<"total"|"done"|"pending"|"overdue"|null>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);
  const [detailItem,      setDetailItem]      = useState<ScheduleItem | null>(null);
  const [editingItem,     setEditingItem]     = useState<ScheduleItem | null>(null);
  const [formVisible,     setFormVisible]     = useState(false);
  const [saving,          setSaving]          = useState(false);

  // Form fields — only used for EDIT, not create
  const [title,            setTitle]            = useState("");
  const [selectedType,     setSelectedType]     = useState<ScheduleType>("Class");
  const [description,      setDescription]      = useState("");
  const [isUrgent,         setIsUrgent]         = useState(false);
  const [selectedDate,     setSelectedDate]     = useState(new Date());
  const [selectedTime,     setSelectedTime]     = useState(new Date());
  const [showDatePicker,   setShowDatePicker]   = useState(false);
  const [showTimePicker,   setShowTimePicker]   = useState(false);
  const [remindMinutes,    setRemindMinutes]    = useState(15);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useFocusEffect(useCallback(() => {
    fetch();
    loadProfile();
    fetchCourses();
  }, []));

  // ── Edit helpers ──────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setSelectedType("Class"); setDescription("");
    setIsUrgent(false); setSelectedDate(new Date()); setSelectedTime(new Date());
    setRemindMinutes(15); setSelectedCourseId(null);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setSelectedType(item.type as ScheduleType);
    setDescription(item.description || "");
    setIsUrgent(item.isUrgent || false);
    setRemindMinutes(item.reminderMinutesBefore ?? 15);
    setSelectedCourseId(item.courseId || null);
    if (item.date) {
      const [y, m, d] = item.date.split("-").map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
    if (item.date && item.startTime) setSelectedTime(buildDateTime(item.date, item.startTime));
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false); setEditingItem(null);
    setShowDatePicker(false); setShowTimePicker(false);
    resetForm();
  };

  const openDetail = (item: ScheduleItem) => { setDetailItem(item); setDetailVisible(true); };

  // ── Update (edit only — create is handled by /add-schedule page) ──────
  const handleUpdate = async () => {
    if (!editingItem || !title.trim()) return;
    setSaving(true);
    const timeStr = toTimeString(selectedTime);
    const dateStr = toDateString(selectedDate);
    try {
      await scheduleService.update(editingItem._id, {
        title: title.trim(), type: selectedType, date: dateStr,
        startTime: timeStr, description: description.trim(),
        isUrgent, courseId: selectedCourseId,
        reminderMinutesBefore: remindMinutes,
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

            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={[s.settingsBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Overview */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Today's overview</Text>
          <OverviewCards
            {...stats}
            colors={colors}
            onPress={cat => { setOverviewCat(cat); setOverviewVisible(true); }}
          />

          {/* Next event */}
          {nextItem && (
            <>
              <Text style={[s.sec, { color: colors.textSecondary }]}>Next up</Text>
              <NextEventCard item={nextItem} colors={colors} />
            </>
          )}

          {/* Urgent */}
          {urgentItems.length > 0 && (
            <>
              <Text style={[s.sec, { color: colors.textSecondary }]}>Needs attention</Text>
              <UrgentList items={urgentItems} colors={colors} />
            </>
          )}

          {/* Schedule list */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Schedule today</Text>
          {items.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.primary + "66"} />
              <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>No schedules yet</Text>
              <TouchableOpacity
                style={[s.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/add-schedule")}
              >
                <Text style={s.emptyBtnTxt}>Add your first task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 0 }}>
              {items.map((item, idx) => (
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

          {/* Quick actions */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Quick actions</Text>
          <View style={s.quickRow}>
            <TouchableOpacity
              style={[s.qBtn, { backgroundColor: colors.card, borderColor: colors.primaryLight }]}
              onPress={() => router.push("/add-schedule")}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={[s.qBtnTxt, { color: colors.textPrimary }]}>Add schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.qBtn, { backgroundColor: colors.card, borderColor: colors.primaryLight }]}
              onPress={refresh}
            >
              <Ionicons name="refresh-outline" size={22} color={colors.primary} />
              <Text style={[s.qBtnTxt, { color: colors.textPrimary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeScreen>

      {/* Edit modal — only for editing existing schedules */}
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
        isUrgent={isUrgent} setIsUrgent={setIsUrgent}
        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
        selectedTime={selectedTime} setSelectedTime={setSelectedTime}
        showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
        showTimePicker={showTimePicker} setShowTimePicker={setShowTimePicker}
        remindMinutes={remindMinutes} setRemindMinutes={setRemindMinutes}
        courses={courses} selectedCourseId={selectedCourseId} setSelectedCourseId={setSelectedCourseId}
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
  greetRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 8 },
  mascotWrap:  { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mascot:      { width: 34, height: 34 },
  settingsBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  greetSub:    { fontSize: 13 },
  greetName:   { fontSize: 20, fontWeight: "500" },
  sec:         { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  empty:       { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:    { fontSize: 14 },
  emptyBtn:    { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "500" },
  quickRow:    { flexDirection: "row", gap: 10 },
  qBtn:        { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 14, alignItems: "center", gap: 6 },
  qBtnTxt:     { fontSize: 12, fontWeight: "500" },
});