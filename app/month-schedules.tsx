import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { scheduleService, ScheduleItem } from "../services/scheduleService";
import { ScheduleDetailModal } from "../components/ScheduleDetailModal";
import { ScheduleCard } from "../components/ScheduleCard";
import { ScheduleFormModal } from "../modals/ScheduleFormModal";
import { SafeScreen } from "../components/SafeScreen";
import { isPastDateTime, getTypeColor, getTypeBg, buildDateTime, toTimeString, toDateString } from "../utils/dateUtils";
import { useNotifications } from "../hooks/useNotification";
import { useCourses } from "../hooks/useCourses";
import type { ScheduleType } from "../constants/scheduleTypes";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type FilterKey = "all" | "pending" | "done" | "overdue" | "done-late";
type SortKey   = "date-asc" | "date-desc" | "title" | "type";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all",       label: "All",       color: "#888"    },
  { key: "pending",   label: "Pending",   color: "#BA7517" },
  { key: "done",      label: "Done",      color: "#639922" },
  { key: "overdue",   label: "Overdue",   color: "#E24B4A" },
  { key: "done-late", label: "Done late", color: "#7F77DD" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "date-asc",  label: "Date ↑" },
  { key: "date-desc", label: "Date ↓" },
  { key: "title",     label: "Title"  },
  { key: "type",      label: "Type"   },
];

function buildDateTimeLocal(date: string, startTime: string): Date {
  try {
    const [y, m, d] = date.split("-").map(Number);
    const cleaned = startTime.replace(/\./g, ":").trim();
    const match   = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return new Date(y, m - 1, d);
    let h = parseInt(match[1]);
    const min = parseInt(match[2]);
    const ap  = match[3]?.toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(y, m - 1, d, h, min);
  } catch { return new Date(); }
}

function getStatus(item: ScheduleItem): FilterKey {
  if (!item.isCompleted) {
    return isPastDateTime(item.date, item.startTime) ? "overdue" : "pending";
  }
  if (item.completedAt) {
    const scheduled = buildDateTimeLocal(item.date, item.startTime);
    const completed = new Date(item.completedAt);
    return completed > scheduled ? "done-late" : "done";
  }
  return "done";
}

export default function MonthSchedules() {
  const { colors, mode } = useTheme();
  const { granted: notifGranted } = useNotifications();
  const { courses, fetch: fetchCourses } = useCourses();
  const params = useLocalSearchParams<{ month: string; year: string }>();
  const month  = parseInt(params.month ?? "0");
  const year   = parseInt(params.year  ?? String(new Date().getFullYear()));

  const [items,         setItems]         = useState<ScheduleItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>("all");
  const [activeSort,    setActiveSort]    = useState<SortKey>("date-asc");
  const [sortOpen,      setSortOpen]      = useState(false);
  const [detailItem,    setDetailItem]    = useState<ScheduleItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [togglingId,    setTogglingId]    = useState<string | null>(null);

  // ── Form (edit) state ──────────────────────────────────────────────────────
  const [formVisible,    setFormVisible]    = useState(false);
  const [editingItem,    setEditingItem]    = useState<ScheduleItem | null>(null);
  const [saving,         setSaving]         = useState(false);
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

  useFocusEffect(useCallback(() => {
    loadItems();
    fetchCourses();
  }, [month, year]));

  const loadItems = async () => {
    try {
      const all = await scheduleService.getAll();
      setItems(all.filter(s => {
        const d = new Date(s.date + "T00:00:00");
        return d.getMonth() === month && d.getFullYear() === year;
      }));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  // ── Toggle ─────────────────────────────────────────────────────────────────
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
      setItems(prev => prev.map(update));
      setDetailItem(prev => prev?._id === item._id ? update(prev) : prev);
    } catch (e) { console.warn("Toggle error:", e); }
    finally { setTogglingId(null); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (item: ScheduleItem) => {
    Alert.alert("Delete Schedule", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await scheduleService.remove(item._id);
            setItems(prev => prev.filter(s => s._id !== item._id));
            setDetailVisible(false);
          } catch (e) { console.warn("Delete error:", e); }
        },
      },
    ]);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
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
    setFormVisible(false); setEditingItem(null);
    setShowDatePicker(false); setShowTimePicker(false);
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
      await loadItems();
      closeForm();
    } catch {
      Alert.alert("Error", "Could not update schedule.");
    } finally {
      setSaving(false);
    }
  };

  // ── List logic ─────────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        (i.code ?? "").toLowerCase().includes(q)
      );
    }
    if (activeFilter !== "all") list = list.filter(i => getStatus(i) === activeFilter);
    list.sort((a, b) => {
      switch (activeSort) {
        case "date-asc":  return a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? "");
        case "date-desc": return b.date.localeCompare(a.date) || (b.startTime ?? "").localeCompare(a.startTime ?? "");
        case "title":     return a.title.localeCompare(b.title);
        case "type":      return a.type.localeCompare(b.type);
        default:          return 0;
      }
    });
    return list;
  }, [items, search, activeFilter, activeSort]);

  const grouped = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    for (const item of displayed) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return Object.entries(map).sort(([a], [b]) =>
      activeSort === "date-desc" ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [displayed, activeSort]);

  type Row = { type: "header"; date: string } | { type: "item"; item: ScheduleItem };
  const rows: Row[] = useMemo(() => {
    if (activeSort === "title" || activeSort === "type") {
      return displayed.map(item => ({ type: "item" as const, item }));
    }
    const result: Row[] = [];
    for (const [date, dayItems] of grouped) {
      result.push({ type: "header", date });
      dayItems.forEach(item => result.push({ type: "item", item }));
    }
    return result;
  }, [grouped, displayed, activeSort]);

  const now      = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const statusColor: Record<FilterKey, string> = {
    all: colors.primary, pending: "#BA7517", done: "#639922",
    overdue: "#E24B4A", "done-late": "#7F77DD",
  };

  const renderRow = ({ item: row }: { item: Row }) => {
    if (row.type === "header") {
      const [y, m, d] = row.date.split("-").map(Number);
      const label   = new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const isToday = row.date === todayStr;
      return (
        <View style={[rs.dateHeader, { borderLeftColor: isToday ? colors.primary : colors.cardBorder }]}>
          <Text style={[rs.dateLabel, { color: isToday ? colors.primary : colors.textSecondary }]}>
            {isToday ? `Today · ${label}` : label}
          </Text>
        </View>
      );
    }

    const { item } = row;
    const isOverdue = isPastDateTime(item.date, item.startTime) && !item.isCompleted;

    return (
      <TouchableOpacity
        style={{ marginHorizontal: 16 }}
        activeOpacity={0.85}
        onPress={() => { setDetailItem(item); setDetailVisible(true); }}
      >
        <ScheduleCard
          item={item}
          isOverdue={isOverdue}
          onToggleComplete={() => toggleComplete(item)}
          onEdit={() => openEdit(item)}
          onDelete={() => handleDelete(item)}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeScreen edges={["top", "bottom"]}>
      {/* ── Detail modal ── */}
      <ScheduleDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleComplete={toggleComplete}
      />

      {/* ── Edit form modal ── */}
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

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{MONTHS[month]} {year}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            {items.length} schedule{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.sortBtn, { backgroundColor: sortOpen ? colors.primaryLight : colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setSortOpen(v => !v)}
        >
          <Ionicons name="funnel-outline" size={16} color={sortOpen ? colors.primary : colors.textPrimary} />
          <Text style={[s.sortBtnTxt, { color: sortOpen ? colors.primary : colors.textPrimary }]}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sort dropdown ── */}
      {sortOpen && (
        <View style={[s.sortDropdown, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {SORTS.map(sort => (
            <TouchableOpacity
              key={sort.key}
              style={[s.sortOption, { borderBottomColor: colors.cardBorder }]}
              onPress={() => { setActiveSort(sort.key); setSortOpen(false); }}
            >
              <Text style={[s.sortOptionTxt, {
                color: activeSort === sort.key ? colors.primary : colors.textPrimary,
                fontWeight: activeSort === sort.key ? "600" : "400",
              }]}>
                {sort.label}
              </Text>
              {activeSort === sort.key && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Search ── */}
      <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="Search schedules..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS === "android" && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          const count  = f.key === "all" ? items.length : items.filter(i => getStatus(i) === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[s.filterChip, { backgroundColor: active ? f.color : colors.card, borderColor: active ? f.color : colors.cardBorder }]}
            >
              <Text style={[s.filterTxt, { color: active ? "#fff" : colors.textSecondary }]}>{f.label}</Text>
              <View style={[s.filterCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.primaryLight }]}>
                <Text style={[s.filterCountTxt, { color: active ? "#fff" : colors.primary }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={44} color={colors.primary + "55"} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Nothing found</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>Try a different filter or search term</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, idx) => row.type === "header" ? `h-${row.date}` : `i-${row.item._id}-${idx}`}
          renderItem={renderRow}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
}

const rs = StyleSheet.create({
  dateHeader: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3, paddingLeft: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  dateLabel:  { fontSize: 13, fontWeight: "600" },
});

const s = StyleSheet.create({
  header:        { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontSize: 17, fontWeight: "600" },
  headerSub:     { fontSize: 12, marginTop: 1 },
  sortBtn:       { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  sortBtnTxt:    { fontSize: 13, fontWeight: "500" },
  sortDropdown:  { borderWidth: 0.5, borderRadius: 12, marginHorizontal: 16, marginTop: 8, overflow: "hidden" },
  sortOption:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5 },
  sortOptionTxt: { fontSize: 14 },
  searchWrap:    { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginVertical: 12, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput:   { flex: 1, fontSize: 14, padding: 0 },
  filterRow:     { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10, flexWrap: "wrap" },
  filterChip:    { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  filterTxt:     { fontSize: 12, fontWeight: "500" },
  filterCount:   { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountTxt:{ fontSize: 11, fontWeight: "600" },
  loader:        { flex: 1, alignItems: "center", justifyContent: "center" },
  empty:         { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySub:      { fontSize: 13, textAlign: "center", lineHeight: 20 },
  listContent:   { paddingBottom: 40 },
});