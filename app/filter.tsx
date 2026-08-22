import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useState, useMemo, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSchedules } from "../hooks/useSchedule";
import { useCourses } from "../hooks/useCourses";
import { CourseChips } from "../components/CourseChips";
import { DateStrip } from "../components/DateStrip";
import { ScheduleDetailModal } from "../components/ScheduleDetailModal";
import { ScheduleFormModal } from "../modals/ScheduleFormModal";
import { ScheduleTodayList } from "../components/ScheduleTodayList";
import { useNotifications } from "../hooks/useNotification";
import { scheduleService, ScheduleItem } from "../services/scheduleService";
import { toTimeString, toDateString, buildDateTime, isPastDateTime } from "../utils/dateUtils";
import type { ScheduleType } from "../constants/scheduleTypes";
import { SafeScreen } from "../components/SafeScreen";

export default function FilterPage() {
  const { colors } = useTheme();
  const { items, fetch, toggleComplete, remove } = useSchedules();
  const { courses, fetch: fetchCourses } = useCourses();
  const { granted: notifGranted } = useNotifications();

  const todayStr = toDateString(new Date());

  const [selectedDate,     setSelectedDate]     = useState(todayStr);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailItem,    setDetailItem]    = useState<ScheduleItem | null>(null);
  const [editingItem,   setEditingItem]   = useState<ScheduleItem | null>(null);
  const [formVisible,   setFormVisible]   = useState(false);
  const [saving,        setSaving]        = useState(false);

  const [title,          setTitle]          = useState("");
  const [selectedType,   setSelectedType]   = useState<ScheduleType>("Class");
  const [description,    setDescription]    = useState("");
  const [isUrgent,       setIsUrgent]       = useState(false);
  const [formDate,       setFormDate]       = useState(new Date());
  const [formTime,       setFormTime]       = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [remindMinutes,  setRemindMinutes]  = useState(15);
  const [formCourseId,   setFormCourseId]   = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetch();
      fetchCourses();
    }, [])
  );

  const activeDates = useMemo(
    () => [...new Set(items.map(i => i.date?.slice(0, 10)).filter(Boolean))] as string[],
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const itemDate    = item.date?.slice(0, 10);
      const dateMatch   = itemDate === selectedDate;
      const courseMatch = selectedCourseId === null || item.courseId === selectedCourseId;
      return dateMatch && courseMatch;
    });
  }, [items, selectedDate, selectedCourseId]);

  const openDetail = (item: ScheduleItem) => {
    setDetailItem(item);
    setDetailVisible(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setSelectedType(item.type as ScheduleType);
    setDescription(item.description || "");
    setIsUrgent(item.isUrgent || false);
    setRemindMinutes(item.reminderMinutesBefore ?? 15);
    setFormCourseId(item.courseId || null);
    if (item.date) {
      const [y, m, d] = item.date.slice(0, 10).split("-").map(Number);
      setFormDate(new Date(y, m - 1, d));
    }
    if (item.date && item.startTime) setFormTime(buildDateTime(item.date, item.startTime));
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingItem(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setTitle("");
    setSelectedType("Class");
    setDescription("");
    setIsUrgent(false);
    setFormDate(new Date());
    setFormTime(new Date());
    setRemindMinutes(15);
    setFormCourseId(null);
  };

  const handleUpdate = async () => {
    if (!editingItem || !title.trim()) return;
    setSaving(true);
    try {
      await scheduleService.update(editingItem._id, {
        title:                title.trim(),
        type:                 selectedType,
        date:                 toDateString(formDate),
        startTime:            toTimeString(formTime),
        description:          description.trim(),
        isUrgent,
        courseId:             formCourseId,
        reminderMinutesBefore: remindMinutes,
      });
      await fetch();
      closeForm();
    } catch (e) {
      Alert.alert("Error", "Could not update.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ScheduleItem) => {
    Alert.alert("Delete", `Remove "${item.title}"?`, [
      { text: "Cancel",  style: "cancel" },
      { text: "Delete",  style: "destructive", onPress: () => remove(item._id) },
    ]);
  };

  const selectedLabel =
    selectedDate === todayStr
      ? "Today"
      : new Date(selectedDate + "T00:00:00").toLocaleDateString("en", {
          weekday: "long",
          month:   "short",
          day:     "numeric",
        });

  return (
    <>
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
              <Text style={[s.pageTitle,    { color: colors.textPrimary }]}>Browse & Filter</Text>
              <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>Find schedules by date or course</Text>
            </View>
          </View>

          {/* Date Strip */}
          <Text style={[s.sec, { color: colors.textSecondary }]}>Browse days</Text>
          <DateStrip
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            colors={colors}
            activeDates={activeDates}
          />

          {/* Course Filter Chips */}
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

          {/* Results header */}
          <View style={s.resultsHeader}>
            <Text style={[s.sec, { color: colors.textSecondary, marginBottom: 0, marginTop: 0 }]}>
              {selectedLabel}
            </Text>
            {(selectedCourseId !== null || selectedDate !== todayStr) && (
              <TouchableOpacity
                onPress={() => { setSelectedDate(todayStr); setSelectedCourseId(null); }}
              >
                <Text style={[s.resetTxt, { color: colors.primary }]}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Schedule list */}
          <ScheduleTodayList
            items={filteredItems}
            colors={colors}
            onOpenDetail={openDetail}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleComplete={toggleComplete}
            emptyLabel="Nothing here for this day"
          />

          <View style={{ height: 40 }} />
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
        title={title}               setTitle={setTitle}
        selectedType={selectedType} setSelectedType={setSelectedType}
        description={description}   setDescription={setDescription}
        isUrgent={isUrgent}         setIsUrgent={setIsUrgent}
        selectedDate={formDate}     setSelectedDate={setFormDate}
        selectedTime={formTime}     setSelectedTime={setFormTime}
        showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
        showTimePicker={showTimePicker} setShowTimePicker={setShowTimePicker}
        remindMinutes={remindMinutes}   setRemindMinutes={setRemindMinutes}
        courses={courses}
        selectedCourseId={formCourseId} setSelectedCourseId={setFormCourseId}
        toTimeString={toTimeString}
        onDelete={editingItem ? () => { closeForm(); handleDelete(editingItem); } : undefined}
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
  screen:        { flex: 1, padding: 16 },
  header:        { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 8 },
  backBtn:       { width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  pageTitle:     { fontSize: 18, fontWeight: "600" },
  pageSubtitle:  { fontSize: 12, marginTop: 1 },
  sec:           { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
  resetTxt:      { fontSize: 12, fontWeight: "600" },
});