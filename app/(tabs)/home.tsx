// app/(tabs)/home.tsx
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
import { FAB } from "../../components/FAB";
import { StreakCounter } from "../../components/StreakCounter";
import { scheduleService, ScheduleItem } from "../../services/scheduleService";
import { toTimeString, toDateString, buildDateTime, isPastDateTime } from "../../utils/dateUtils";
import type { ScheduleType } from "../../constants/scheduleTypes";
import { SafeScreen } from "../../components/SafeScreen";
import { ScheduleTodayList } from "../../components/ScheduleTodayList";

export default function Home() {
  const MASCOT = require("../../assets/images/notification-icon.png");
  const { colors, mode } = useTheme();
  const { items, loading, refreshing, fetch, refresh, toggleComplete, remove, stats, nextItem, urgentItems } = useSchedules();
  const { profile, load: loadProfile } = useProfile();
  const { granted: notifGranted } = useNotifications();
  const { courses, fetch: fetchCourses } = useCourses();
  const { streak, markDayComplete } = useStreak();

  const [overviewVisible, setOverviewVisible] = useState(false);
  const [overviewCat,     setOverviewCat]     = useState<"total"|"done"|"pending"|"overdue"|null>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);
  const [detailItem,      setDetailItem]      = useState<ScheduleItem | null>(null);
  const [editingItem,     setEditingItem]     = useState<ScheduleItem | null>(null);
  const [formVisible,     setFormVisible]     = useState(false);
  const [saving,          setSaving]          = useState(false);

  // ✅ Multi-delete state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [deleting,      setDeleting]      = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItems = useMemo(() => items.filter(i => i.date === todayStr), [items, todayStr]);

  // Form fields — only used for EDIT
  const [title,          setTitle]          = useState("");
  const [selectedType,   setSelectedType]   = useState<ScheduleType>("Class");
  const [description,    setDescription]    = useState("");
  const [isUrgentForm,   setIsUrgentForm]   = useState(false);
  const [formDate,       setFormDate]       = useState(new Date());
  const [formTime,       setFormTime]       = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [remindMinutes,  setRemindMinutes]  = useState(15);
  const [formCourseId,   setFormCourseId]   = useState<string | null>(null);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useFocusEffect(useCallback(() => {
    fetch();
    loadProfile();
    fetchCourses();
  }, []));

  useEffect(() => {
    const todayItems = items.filter(i => i.date === todayStr);
    if (todayItems.length > 0 && todayItems.every(i => i.isCompleted)) {
      markDayComplete();
    }
  }, [items]);

  const overdueCount = useMemo(
    () => items.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime)).length,
    [items]
  );

  // ── Selection helpers ─────────────────────────────────────────────────
  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    // ✅ Auto-enter selection mode on long-press from ScheduleTodayList
    if (!selectionMode) setSelectionMode(true);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(todayItems.map(i => i._id)));
  };

  const allSelected = todayItems.length > 0 && selectedIds.size === todayItems.length;

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Delete schedules",
      `Permanently delete ${selectedIds.size} schedule${selectedIds.size > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              // ✅ Delete all selected in parallel
              await Promise.all([...selectedIds].map(id => scheduleService.remove(id)));
              await fetch();
              exitSelectionMode();
            } catch {
              Alert.alert("Error", "Some items could not be deleted.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Edit helpers ──────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setSelectedType("Class"); setDescription("");
    setIsUrgentForm(false); setFormDate(new Date()); setFormTime(new Date());
    setRemindMinutes(15); setFormCourseId(null);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setSelectedType(item.type as ScheduleType);
    setDescription(item.description || "");
    setIsUrgentForm(item.isUrgent || false);
    setRemindMinutes(item.reminderMinutesBefore ?? 15);
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

  const handleUpdate = async () => {
    if (!editingItem || !title.trim()) return;
    setSaving(true);
    try {
      await scheduleService.update(editingItem._id, {
        title: title.trim(), type: selectedType,
        date: toDateString(formDate), startTime: toTimeString(formTime),
        description: description.trim(), isUrgent: isUrgentForm,
        courseId: formCourseId, reminderMinutesBefore: remindMinutes,
      });
      await fetch();
      closeForm();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update.");
    } finally { setSaving(false); }
  };

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

            <StreakCounter colors={colors} streak={streak} />

            <TouchableOpacity
              onPress={() => router.push("/filter")}
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="search-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Overview cards */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Today's overview</Text>
          <OverviewCards
            {...stats}
            colors={colors}
            onPress={cat => { setOverviewCat(cat); setOverviewVisible(true); }}
          />

          {/* Next event + Urgent */}
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

          {/* ── SCHEDULE TODAY HEADER ── */}
          <View style={s.secRow}>
            <Text style={[s.sec, { color: colors.textSecondary, marginBottom: 0, marginTop: 0 }]}>
              Schedule today
            </Text>

            <View style={s.secActions}>
              {selectionMode ? (
                <>
                  {/* Select all toggle */}
                  <TouchableOpacity
                    onPress={allSelected ? exitSelectionMode : selectAll}
                    style={[s.secBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                  >
                    <Ionicons
                      name={allSelected ? "checkbox-outline" : "square-outline"}
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={[s.secBtnTxt, { color: colors.textSecondary }]}>
                      {allSelected ? "Deselect all" : "Select all"}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete selected */}
                  <TouchableOpacity
                    onPress={handleBulkDelete}
                    disabled={selectedIds.size === 0 || deleting}
                    style={[
                      s.secBtn,
                      { borderColor: "#E24B4A", backgroundColor: "#FCEBEB" },
                      (selectedIds.size === 0 || deleting) && { opacity: 0.4 },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#E24B4A" />
                    <Text style={[s.secBtnTxt, { color: "#E24B4A" }]}>
                      {deleting ? "Deleting..." : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
                    </Text>
                  </TouchableOpacity>

                  {/* Cancel */}
                  <TouchableOpacity onPress={exitSelectionMode} style={s.cancelBtn}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              ) : (
                /* ✅ Entry point — only shown when there are today's items */
                todayItems.length > 0 && (
                  <TouchableOpacity
                    onPress={enterSelectionMode}
                    style={[s.secBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                    <Text style={[s.secBtnTxt, { color: colors.textSecondary }]}>Select</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          <ScheduleTodayList
            items={items}
            colors={colors}
            onOpenDetail={openDetail}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleComplete={toggleComplete}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        <FAB onPress={() => router.push("/add-schedule")} color={colors.primary} />
      </SafeScreen>

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
        remindMinutes={remindMinutes} setRemindMinutes={setRemindMinutes}
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
  greetRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, paddingTop: 8 },
  mascotWrap:  { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mascot:      { width: 34, height: 34 },
  iconBtn:     { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  greetSub:    { fontSize: 13 },
  greetName:   { fontSize: 20, fontWeight: "500" },
  sec:         { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  // ✅ Section header row — label + action buttons side by side
  secRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 8 },
  secActions:  { flexDirection: "row", alignItems: "center", gap: 6 },
  secBtn:      { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  secBtnTxt:   { fontSize: 11, fontWeight: "500" },
  cancelBtn:   { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
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