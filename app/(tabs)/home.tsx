import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from "react-native";
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
  const { colors } = useTheme();
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

  // Multi-delete state
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
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showReminderPicker, setShowReminderPicker] = useState(false);
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

  const enterSelectionMode = () => { setSelectionMode(true); setSelectedIds(new Set()); };
  const exitSelectionMode  = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const toggleSelect = (id: string) => {
    if (!selectionMode) setSelectionMode(true);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelectedIds(new Set(todayItems.map(i => i._id)));
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

  const handleUpdate = async () => {
    if (!editingItem || !title.trim()) return;
    setSaving(true);
    try {
      await scheduleService.update(editingItem._id, {
        title: title.trim(), type: selectedType,
        date: toDateString(formDate), startTime: toTimeString(formTime),
        description: description.trim(), isUrgent: isUrgentForm,
        courseId: formCourseId, reminderMinutesBefore: 0,
        reminderTime: toTimeString(reminderTime),
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
            <View style={{ flex: 1 }}>
              <Text style={[s.greetSub,  { color: colors.textSecondary }]}>{greeting},</Text>
              <Text style={[s.greetName, { color: colors.textPrimary }]}>SnowEd</Text>
            </View>

            <StreakCounter colors={colors} streak={streak} />

            <TouchableOpacity
              onPress={() => router.push("/stats")}
              style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

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

        

          {/* SCHEDULE TODAY HEADER */}
          {/* SCHEDULE TODAY HEADER */}
          <View style={s.secRow}>
            <Text style={[s.sec, { color: colors.textSecondary, marginBottom: 0, marginTop: 0 }]}>
              Schedule today
            </Text>
            <View style={s.secActions}>
              
              {/* NEW: Add Button (Hidden during selection mode to keep layout clean) */}
              {!selectionMode && (
                <TouchableOpacity
                  onPress={() => router.push("/add-schedule")}
                  style={[
                    s.secBtn, 
                    { backgroundColor: colors.primary, borderColor: colors.primary, paddingHorizontal: 12 }
                  ]}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={[s.secBtnTxt, { color: "#ffffff", fontWeight: "600" }]}>
                    Add New
                  </Text>
                </TouchableOpacity>
              )}

              {selectionMode ? (
                <>
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

                  <TouchableOpacity onPress={exitSelectionMode} style={s.cancelBtn}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              ) : (
                todayItems.length > 0 && (
                  <TouchableOpacity
                    onPress={enterSelectionMode}
                    style={[s.secBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.textSecondary} />
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
            showCompletionAction={false}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        
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
  greetRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, paddingTop: 8 },
  iconBtn:     { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  greetSub:    { fontSize: 13 },
  greetName:   { fontSize: 20, fontWeight: "500" },
  sec:         { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
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