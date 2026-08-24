import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, RefreshControl, Alert, Platform } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isPastDateTime, toTimeString, toDateString, buildDateTime } from "../../utils/dateUtils";
import { useTheme } from "../../context/ThemeContext";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";
import { ScheduleCard } from "../../components/ScheduleCard";
import { ScheduleFormModal } from "../../modals/ScheduleFormModal";
import { scheduleService, ScheduleItem } from "../../services/scheduleService";
import { useNotifications } from "../../hooks/useNotification";
import { useCourses } from "../../hooks/useCourses";
import type { ScheduleType } from "../../constants/scheduleTypes";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TYPE_COLORS: Record<string, string> = {
  Quiz:     "#BA7517",
  Activity: "rgb(31,160,160)",
  Review:   "#7F77DD",
  Class:    "#c5cf08",
  Duty:     "#D4537E",
  Study:    "#378ADD",
  General:  "#21a702",
};

// How tall the BubbleNav + its bottom offset is — content scrolls above this
const BUBBLE_CLEARANCE = 100;

export default function Calendar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { granted: notifGranted } = useNotifications();
  const { courses, fetch: fetchCourses } = useCourses();
  const today = new Date();

  const [viewYear,        setViewYear]        = useState(today.getFullYear());
  const [viewMonth,       setViewMonth]       = useState(today.getMonth());
  const [allSchedules,    setAllSchedules]    = useState<ScheduleItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [detailItem,      setDetailItem]      = useState<ScheduleItem | null>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);
  const [togglingId,      setTogglingId]      = useState<string | null>(null);

  const [formVisible,     setFormVisible]     = useState(false);
  const [editingItem,     setEditingItem]     = useState<ScheduleItem | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [title,           setTitle]           = useState("");
  const [selectedType,    setSelectedType]    = useState<ScheduleType>("Class");
  const [description,     setDescription]     = useState("");
  const [isUrgentForm,    setIsUrgentForm]    = useState(false);
  const [formDate,        setFormDate]        = useState(new Date());
  const [formTime,        setFormTime]        = useState(new Date());
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [showTimePicker,  setShowTimePicker]  = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [formCourseId,    setFormCourseId]    = useState<string | null>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  useFocusEffect(useCallback(() => {
    fetchAll();
    fetchCourses();
  }, []));

  const fetchAll = async () => {
    try {
      const data = await scheduleService.getAll();
      setAllSchedules(data as ScheduleItem[]);
    } catch (e) {
      console.warn("Calendar fetchAll error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const toggleComplete = async (item: ScheduleItem) => {
    if (togglingId === item._id) return;
    setTogglingId(item._id);
    try {
      const nowIso = new Date().toISOString();
      const next = !item.isCompleted;
      await scheduleService.update(item._id, {
        isCompleted: next,
        completedAt: next ? nowIso : null,
      });
      const update = (s: ScheduleItem) =>
        s._id === item._id ? { ...s, isCompleted: next, completedAt: next ? nowIso : null } : s;
      setAllSchedules(prev => prev.map(update));
      setDetailItem(prev => prev?._id === item._id ? update(prev) : prev);
    } catch (e) {
      console.warn("Toggle error:", e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (item: ScheduleItem) => {
    Alert.alert("Delete Schedule", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await scheduleService.remove(item._id);
            setAllSchedules(prev => prev.filter(s => s._id !== item._id));
            setDetailVisible(false);
          } catch (e) { console.warn("Delete error:", e); }
        },
      },
    ]);
  };

  const resetForm = () => {
    setTitle(""); setSelectedType("Class"); setDescription("");
    setIsUrgentForm(false); setFormDate(new Date()); setFormTime(new Date());
    setReminderTime(new Date()); setShowReminderPicker(false); setFormCourseId(null);
  };

  const openEdit = (item: ScheduleItem) => {
    setDetailVisible(false);
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
    setTimeout(() => setFormVisible(true), 350);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingItem(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    resetForm();
  };

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
      await fetchAll();
      closeForm();
    } catch (e) {
      Alert.alert("Error", "Could not update schedule.");
    } finally {
      setSaving(false);
    }
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const makeDateStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const schedulesForDate = (ds: string) => allSchedules.filter(s => s.date === ds);
  const openDay = (ds: string) => { setSelectedDate(ds); setDayModalVisible(true); };

  const selectedItems   = selectedDate ? schedulesForDate(selectedDate) : [];
  const selectedDone    = selectedItems.filter(i => i.isCompleted);
  const selectedPending = selectedItems.filter(i => !i.isCompleted);
  const selectedOverdue = selectedItems.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime));
  const totalOverdue    = allSchedules.filter(s => !s.isCompleted && isPastDateTime(s.date, s.startTime)).length;

  const sortedSelectedItems = [
    ...selectedOverdue,
    ...selectedPending.filter(i => !isPastDateTime(i.date, i.startTime)),
    ...selectedDone,
  ];

  const formatSelectedDate = (ds: string) => {
    if (!ds) return "";
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  };

  const buildTypeDots = (dayItems: ScheduleItem[]) => {
    const seen = new Map<string, boolean>();
    for (const i of dayItems) {
      if (!seen.has(i.type)) seen.set(i.type, i.isCompleted);
      else if (!i.isCompleted) seen.set(i.type, false);
    }
    return [...seen.entries()];
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Bottom padding = safe area + BubbleNav clearance
  const bottomPad = (insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 0)) + BUBBLE_CLEARANCE;

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <>
      <ScheduleDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleComplete={toggleComplete}
      />

      <ScheduleFormModal
        visible={formVisible}
        onClose={closeForm}
        onSubmit={handleUpdate}
        editingItem={editingItem}
        saving={saving}
        notifGranted={notifGranted}
        colors={colors}
        title={title}                   setTitle={setTitle}
        selectedType={selectedType}     setSelectedType={setSelectedType}
        description={description}       setDescription={setDescription}
        isUrgent={isUrgentForm}         setIsUrgent={setIsUrgentForm}
        selectedDate={formDate}         setSelectedDate={setFormDate}
        selectedTime={formTime}         setSelectedTime={setFormTime}
        showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
        showTimePicker={showTimePicker} setShowTimePicker={setShowTimePicker}
        reminderTime={reminderTime} setReminderTime={setReminderTime}
        showReminderPicker={showReminderPicker} setShowReminderPicker={setShowReminderPicker}
        courses={courses}
        selectedCourseId={formCourseId} setSelectedCourseId={setFormCourseId}
        toTimeString={toTimeString}
        onDelete={editingItem ? () => { closeForm(); handleDelete(editingItem); } : undefined}
      />

      <ScrollView
        style={[s.screen, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── PAGE HEADER — title left, view-all button right ── */}
        <View style={s.pageHeader}>
          <View style={s.pageTitleBlock}>
            <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Calendar</Text>
            {totalOverdue > 0 && (
              <View style={s.overdueBadge}>
                <Ionicons name="warning" size={13} color="#fff" />
                <Text style={s.overdueBadgeTxt}>{totalOverdue} overdue</Text>
              </View>
            )}
          </View>

          {/* View all schedules — top right */}
          <TouchableOpacity
            style={[s.viewAllBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: "/month-schedules",
              params: { month: String(viewMonth), year: String(viewYear) },
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="list-outline" size={15} color="#fff" />
            <Text style={s.viewAllTxt}>View all</Text>
          </TouchableOpacity>
        </View>

        {/* Month nav */}
        <View style={[s.monthNav, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[s.monthLabel, { color: colors.textPrimary }]}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {([
            ["Class",    "#c5cf08"         ],
            ["Quiz",     "#BA7517"         ],
            ["Activity", "rgb(31,160,160)" ],
            ["Review",   "#7F77DD"         ],
            ["Duty",     "#D4537E"         ],
            ["Study",    "#378ADD"         ],
            ["General",  "#21a702"         ],
          ] as [string, string][]).map(([l, c]) => (
            <View key={l} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c }]} />
              <Text style={[s.legendTxt, { color: colors.textSecondary }]}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={[s.grid, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {DAYS.map(d => (
            <View key={d} style={[s.dayHeader, { borderBottomColor: colors.primaryLight }]}>
              <Text style={[s.dayHeaderTxt, { color: colors.textSecondary }]}>{d}</Text>
            </View>
          ))}
          {cells.map((day, idx) => {
            if (!day) return <View key={`e${idx}`} style={[s.cell, { borderColor: colors.background }]} />;

            const ds       = makeDateStr(day);
            const dayItems = schedulesForDate(ds);
            const isToday  = ds === todayStr;
            const isSel    = ds === selectedDate;
            const typeDots    = buildTypeDots(dayItems);
            const visibleDots = typeDots.slice(0, 4);
            const overflow    = typeDots.length - visibleDots.length;

            return (
              <TouchableOpacity
                key={ds}
                style={[
                  s.cell,
                  { borderColor: colors.background },
                  isToday && { backgroundColor: colors.primaryLight },
                  isSel   && { backgroundColor: colors.primary },
                ]}
                onPress={() => openDay(ds)}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.cellNum,
                  { color: colors.textPrimary },
                  isToday && { color: colors.primary },
                  isSel   && { color: "#fff" },
                ]}>
                  {day}
                </Text>
                {dayItems.length > 0 && (
                  <View style={s.dotRow}>
                    {visibleDots.map(([type, allDone]) => (
                      <View
                        key={type}
                        style={[
                          s.cellDot,
                          { backgroundColor: TYPE_COLORS[type] ?? colors.primary, opacity: allDone ? 0.4 : 1 },
                        ]}
                      />
                    ))}
                    {overflow > 0 && (
                      <Text style={[s.moreIndicator, { color: isSel ? "#fff" : colors.textSecondary }]}>
                        +{overflow}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Monthly summary */}
        <View style={s.summaryRow}>
          {[
            { label: "This month", color: colors.primary, value: allSchedules.filter(s => { const d = new Date(s.date + "T00:00:00"); return d.getMonth() === viewMonth && d.getFullYear() === viewYear; }).length },
            { label: "Completed",  color: "#639922",      value: allSchedules.filter(s => { const d = new Date(s.date + "T00:00:00"); return d.getMonth() === viewMonth && d.getFullYear() === viewYear && s.isCompleted; }).length },
            { label: "Pending",    color: "#BA7517",      value: allSchedules.filter(s => { const d = new Date(s.date + "T00:00:00"); return d.getMonth() === viewMonth && d.getFullYear() === viewYear && !s.isCompleted; }).length },
          ].map(({ label, color, value }) => (
            <View key={label} style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[s.summaryNum, { color }]}>{value}</Text>
              <Text style={[s.summaryLbl, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Day detail modal */}
      <Modal visible={dayModalVisible} animationType="slide" transparent onRequestClose={() => setDayModalVisible(false)}>
        <View style={[s.modalOverlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <View style={[s.modalSheet, { backgroundColor: colors.background }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                  {selectedDate ? formatSelectedDate(selectedDate) : ""}
                </Text>
                <Text style={[s.modalSub, { color: colors.textSecondary }]}>
                  {selectedItems.length === 0
                    ? "Nothing scheduled"
                    : selectedOverdue.length > 0
                    ? `${selectedItems.length} task${selectedItems.length > 1 ? "s" : ""} · ${selectedOverdue.length} overdue · ${selectedDone.length} done`
                    : `${selectedItems.length} task${selectedItems.length > 1 ? "s" : ""} · ${selectedDone.length} done`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDayModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedItems.length === 0 ? (
                <View style={s.modalEmpty}>
                  <Ionicons name="checkmark-circle-outline" size={40} color={colors.primaryDark} />
                  <Text style={[s.modalEmptyTxt, { color: colors.textSecondary }]}>Free day — nothing scheduled</Text>
                </View>
              ) : (
                sortedSelectedItems.map(item => (
                  <TouchableOpacity
                    key={item._id}
                    activeOpacity={0.85}
                    onPress={() => { setDetailItem(item); setDetailVisible(true); }}
                  >
                    <ScheduleCard
                      item={item}
                      isOverdue={isPastDateTime(item.date, item.startTime) && !item.isCompleted}
                      onToggleComplete={() => toggleComplete(item)}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen:     { flex: 1, paddingHorizontal: 16 },
  loader:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:  { fontSize: 14 },

  // ── Page header — title + view all in one row ──
  pageHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     16,
    paddingBottom:  10,
  },
  pageTitleBlock: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  pageTitle:  { fontSize: 22, fontWeight: "500" },
  overdueBadge: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    backgroundColor:"#E24B4A",
    borderRadius:   10,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  overdueBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // View all — top right pill button
  viewAllBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            5,
    borderRadius:   20,
    paddingHorizontal: 12,
    paddingVertical:    7,
  },
  viewAllTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },

  monthNav:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 0.5, borderRadius: 14, padding: 12, marginBottom: 14 },
  monthLabel: { fontSize: 16, fontWeight: "500" },
  navBtn:     { padding: 4 },

  legend:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendTxt:  { fontSize: 11 },

  grid:          { flexDirection: "row", flexWrap: "wrap", borderRadius: 16, borderWidth: 0.5, overflow: "hidden", marginBottom: 16 },
  dayHeader:     { width: "14.28%", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5 },
  dayHeaderTxt:  { fontSize: 11, fontWeight: "500" },
  cell:          { width: "14.28%", minHeight: 54, alignItems: "center", paddingTop: 8, paddingBottom: 6, borderWidth: 0.5 },
  cellNum:       { fontSize: 14, fontWeight: "500" },
  dotRow:        { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3, flexWrap: "wrap", justifyContent: "center" },
  cellDot:       { width: 5, height: 5, borderRadius: 3 },
  moreIndicator: { fontSize: 9, fontWeight: "500" },

  summaryRow:  { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard: { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 12, alignItems: "center" },
  summaryNum:  { fontSize: 22, fontWeight: "500" },
  summaryLbl:  { fontSize: 11, marginTop: 4 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: "500", maxWidth: 260 },
  modalSub:     { fontSize: 12, marginTop: 3 },
  modalEmpty:   { alignItems: "center", paddingVertical: 36, gap: 10 },
  modalEmptyTxt:{ fontSize: 14 },
});