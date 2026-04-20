import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Platform, Image } from "react-native";
import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications, scheduleActivityNotification, cancelNotification } from "../../services/NotificationService";
import { API_URL } from "../../constants/apiUrl";
import { TYPES, ScheduleType, TYPE_COLORS, TYPE_BG } from "../../constants/scheduleTypes";
import { toTimeString, toDateString, buildDateTime, isPastDateTime } from "../../utils/dateUtils";
import { ScheduleCard } from "../../components/ScheduleCard";
import { useTheme } from "../../context/ThemeContext";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";


type ScheduleItem = {
  _id: string; title: string; type: ScheduleType;
  date: string; startTime: string;
  description?: string; isCompleted: boolean;
  isUrgent?: boolean; courseId?: string | null;
  reminderMinutesBefore?: number;   // ← add this
};

type ProfileData = {
  name: string;
  course: string;
  year: string;
  section: string;
  school: string;
  avatar: string | null;
};

const DEFAULT_PROFILE: ProfileData = {
  name: "Maria Santos", course: "BS Nursing",
  year: "3rd Year", section: "Section A", school: "", avatar: null,
};
const REMIND_OPTIONS = [
  { label: "At start time",  value: 0   },
  { label: "5 min before",   value: 5   },
  { label: "15 min before",  value: 15  },
  { label: "30 min before",  value: 30  },
  { label: "1 hour before",  value: 60  },
  { label: "2 hours before", value: 120 },
  { label: "1 day before",   value: 1440},
];



export default function Home() {
  const normalizeSchedule = (item: any) => ({
  _id: item._id,
  title: item.title ?? "",
  type: item.type ?? "General",
  date: item.date ?? "",
  startTime: item.startTime ?? "",
  description: item.description ?? "",
  isCompleted: item.isCompleted ?? false,
  isUrgent: item.isUrgent ?? false,
});
  const [remindMinutes, setRemindMinutes] = useState<number>(15);
  const { colors, scheme } = useTheme();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [overviewCategory, setOverviewCategory] = useState<"total" | "done" | "pending" | "overdue" | null>(null);
  const [overviewModalVisible, setOverviewModalVisible] = useState(false);
  const [courses, setCourses] = useState<{_id: string; name: string; color: string; code: string}[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ScheduleItem | null>(null);
const [detailVisible, setDetailVisible] = useState(false);

const openDetail = (item: ScheduleItem) => {
  setDetailItem(item);
  setDetailVisible(true);
};

  // Form state
  const [title, setTitle] = useState("");
  const [selectedType, setSelectedType] = useState<ScheduleType>("Class");
  const [description, setDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const today = toDateString(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const done = items.filter(i => i.isCompleted).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextItem = items.find(i => !i.isCompleted);
  const urgentItems = items.filter(i => i.isUrgent && !i.isCompleted);
  const overdue = items.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime)).length;
  const pending = items.filter(i => !i.isCompleted && !isPastDateTime(i.date, i.startTime)).length;

  // ─── INIT NOTIFICATIONS ──────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    registerForPushNotifications().then(setNotifGranted);
    fetchSchedules();
    fetchCourses();
    AsyncStorage.getItem("profileData").then(v => {
      if (v) { const p = JSON.parse(v); setProfile(p); }
    });

    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, []));

  // ─── FETCH ───────────────────────────────────────────────────────────
const fetchSchedules = async () => {
  try {
    // Recompute today every time we fetch — avoids stale date
    const todayFresh = toDateString(new Date());
    const res = await fetch(`${API_URL}/schedules/${todayFresh}`);

    if (!res.ok) {
      console.warn("Schedule fetch failed:", res.status);
      setItems([]);
      return;
    }

    const data = await res.json();
    const safe = Array.isArray(data) ? data : [];
    safe.sort((a: ScheduleItem, b: ScheduleItem) =>
      (a.startTime ?? "").localeCompare(b.startTime ?? "")
    );
    setItems(safe);
  } catch (e) {
    console.warn("fetchSchedules error:", e);
    // Don't show an alert — just leave list empty so user can refresh
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/courses`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchSchedules(); };

  // ─── RESET FORM ──────────────────────────────────────────────────────
  const resetForm = () => {
    setRemindMinutes(15);
    setSelectedCourseId(null);
    setTitle(""); setSelectedType("Class"); setDescription("");
    setIsUrgent(false);
    setSelectedDate(new Date()); setSelectedTime(new Date());
  };

  const handleCreate = async () => {
  if (!title.trim()) {
    Alert.alert("Missing field", "Please enter a title.");
    return;
  }

  setSaving(true);

  const timeStr = toTimeString(selectedTime);
  const dateStr = toDateString(selectedDate);

  try {
    const res = await fetch(`${API_URL}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type: selectedType || "General",
        date: dateStr,
        startTime: timeStr,
        description: description.trim(),
        isUrgent,
        isCompleted: false,
        courseId: selectedCourseId,
      }),
    });

    const raw = await res.json();
    console.log("CREATE:", raw);

    // ✅ REFETCH INSTEAD OF MANUAL STATE
    await fetchSchedules();

    if (notifGranted) {
      const dt = buildDateTime(dateStr, timeStr);
      const triggerDt = new Date(dt.getTime() - remindMinutes * 60 * 1000);
      const effectiveDt = triggerDt > new Date() ? triggerDt : dt;

      await scheduleActivityNotification(
        raw._id,
        raw.title,
        raw.type,
        raw.description ?? "",
        effectiveDt,
        raw.isUrgent ?? false,
        scheme
      );
    }

    closeModal();
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Could not save schedule.");
  } finally {
    setSaving(false);
  }
};

 const handleUpdate = async () => {
  if (!editingItem) return;

  if (!title.trim()) {
    Alert.alert("Missing field", "Please enter a title.");
    return;
  }

  setSaving(true);

  const timeStr = toTimeString(selectedTime);
  const dateStr = toDateString(selectedDate);

  try {
    const res = await fetch(`${API_URL}/schedules/${editingItem._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type: selectedType || "General",
        date: dateStr,
        startTime: timeStr,
        description: description.trim(),
        isUrgent,
        courseId: selectedCourseId,
      }),
    });

    const raw = await res.json();
    console.log("UPDATE:", raw);

    // ✅ REFETCH
    await fetchSchedules();

    if (notifGranted) {
      const dt = buildDateTime(dateStr, timeStr);
      await scheduleActivityNotification(
        raw._id,
        raw.title,
        raw.type,
        raw.description ?? "",
        dt,
        raw.isUrgent ?? false,
        scheme
      );
    }

    closeModal();
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Could not update schedule.");
  } finally {
    setSaving(false);
  }
};
  // ─── TOGGLE COMPLETE ─────────────────────────────────────────────────
  const toggleComplete = async (item: ScheduleItem) => {
    const updated = { ...item, isCompleted: !item.isCompleted };
    setItems(prev => prev.map(i => i._id === item._id ? updated : i));
    try {
      await fetch(`${API_URL}/schedules/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: updated.isCompleted }),
      });
      if (updated.isCompleted) await cancelNotification(item._id);
    } catch {
      setItems(prev => prev.map(i => i._id === item._id ? item : i));
    }
  };

  // ─── DELETE ──────────────────────────────────────────────────────────
  const handleDelete = (item: ScheduleItem) => {
    Alert.alert("Delete schedule", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setItems(prev => prev.filter(i => i._id !== item._id));
          await cancelNotification(item._id);
          await fetch(`${API_URL}/schedules/${item._id}`, { method: "DELETE" }).catch(() => {});
        },
      },
    ]);
  };

  // ─── MODAL OPEN/CLOSE ────────────────────────────────────────────────
  const openCreate = () => {
    resetForm();
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setRemindMinutes(item.reminderMinutesBefore ?? 15);
    setEditingItem(item);
    setTitle(item.title);
    setSelectedType(item.type);
    setDescription(item.description || "");
    setIsUrgent(item.isUrgent || false);
    setSelectedCourseId(item.courseId || null);
    // Parse existing date/time back into Date objects
    if (item.date) {
      const [y, m, d] = item.date.split("-").map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
    if (item.date && item.startTime) {
      setSelectedTime(buildDateTime(item.date, item.startTime));
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    resetForm();
  };


  // ─── CLOSE OVERVIEW MODAL ────────────────────────────────────────────
  const closeOverviewModal = () => {
    setOverviewModalVisible(false);
    setTimeout(() => setOverviewCategory(null), 300);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[baseStyles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[baseStyles.loaderTxt, { color: colors.textSecondary }]}>Loading your schedule...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[baseStyles.screen, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* GREETING */}
        <View style={baseStyles.greetRow}>
          <View>
            <Text style={[baseStyles.greetSub, { color: colors.textSecondary }]}>{greeting},</Text>
            <Text style={[baseStyles.greetName, { color: colors.textPrimary }]}>{profile.name}</Text>
          </View>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={[baseStyles.avatar, { borderColor: colors.primaryLight }]} />
          ) : (
            <View style={[baseStyles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}>
              <Text style={[baseStyles.avatarTxt, { color: colors.primary }]}>{(profile.name || "").split(" ").filter(w => w).map(w => w[0]).slice(0, 2).join("").toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* OVERVIEW */}
        <Text style={[baseStyles.sec, { color: colors.textSecondary }]}>Today's overview</Text>
        <View style={baseStyles.ovRow}>
          {([["Total", total, colors.primary, "total"], ["Done", done, "#639922", "done"], ["Pending", pending, "#BA7517", "pending"], ["Overdue", overdue, "#E24B4A", "overdue"]] as const).map(([l, n, c, cat]) => (
            <TouchableOpacity 
              key={l} 
              style={[baseStyles.ovCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => {
                setOverviewCategory(cat);
                setOverviewModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[baseStyles.ovNum, { color: c }]}>{n}</Text>
              <Text style={[baseStyles.ovLbl, { color: colors.textSecondary }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={baseStyles.progMeta}>
          <Text style={[baseStyles.progLbl, { color: colors.textSecondary }]}>Progress today</Text>
          <Text style={[baseStyles.progPct, { color: colors.primary }]}>{pct}%</Text>
        </View>
        <View style={[baseStyles.progWrap, { backgroundColor: colors.primaryLight }]}>
          <View style={[baseStyles.progBar, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
        </View>

        {/* NEXT EVENT */}
        {nextItem && (
          <View key={`nextEvent-${nextItem._id}`}>
            <Text style={[baseStyles.sec, { color: colors.textSecondary }]}>Next up</Text>
            <View style={[baseStyles.nextCard, { backgroundColor: colors.primary }]}>
              <View style={[baseStyles.nextIco, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Ionicons name="time-outline" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={baseStyles.nextTitle}>{nextItem.title}</Text>
                <Text style={baseStyles.nextSub}>{nextItem.description || nextItem.type}</Text>
              </View>
              <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={baseStyles.nextBadgeTxt}>{nextItem.startTime}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ALERTS */}
        {urgentItems.length > 0 && (
          <View key="alerts">
            <Text style={[baseStyles.sec, { color: colors.textSecondary }]}>Needs attention</Text>
            {urgentItems.map((item, idx) => (
              <View key={`urgent-${item._id}-${idx}`} style={[baseStyles.alertCard, { backgroundColor: "#FAEEDA", borderColor: "#FAC775" }]}>
                <Ionicons name="warning-outline" size={18} color="#BA7517" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[baseStyles.alertTitle, { color: "#633806" }]}>{item.title}</Text>
                  <Text style={[baseStyles.alertSub, { color: "#854F0B" }]}>{item.description || item.type} · {item.startTime}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SCHEDULE LIST */}
        <Text style={[baseStyles.sec, { color: colors.textSecondary }]}>Schedule today</Text>
        {items.length === 0 ? (
          <View key="emptySchedule" style={baseStyles.empty}>
            <Ionicons name="calendar-outline" size={40} color={colors.primaryDark} />
            <Text style={[baseStyles.emptyTxt, { color: colors.textSecondary }]}>No schedules yet for today</Text>
            <TouchableOpacity style={[baseStyles.emptyBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
              <Text style={baseStyles.emptyBtnTxt}>Add your first task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View key={`scheduleList-${items.length}`}>
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
                    if (item.isCompleted || (!item.isCompleted && isPastDateTime(item.date, item.startTime))) {
                      return;
                    }
                    openEdit(item);
                  }}
                  onDelete={() => handleDelete(item)}
                  onToggleComplete={() => toggleComplete(item)}
                />
              </TouchableOpacity>
              
            ))}
          </View>
        )}

        {/* QUICK ACTIONS */}
        <Text style={[baseStyles.sec, { color: colors.textSecondary }]}>Quick actions</Text>
        <View style={baseStyles.quickRow}>
          <TouchableOpacity style={[baseStyles.qBtn, { backgroundColor: colors.card, borderColor: colors.primaryLight }]} onPress={openCreate}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={[baseStyles.qBtnTxt, { color: colors.textPrimary }]}>Add schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[baseStyles.qBtn, { backgroundColor: colors.card, borderColor: colors.primaryLight }]} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
            <Text style={[baseStyles.qBtnTxt, { color: colors.textPrimary }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── ADD / EDIT MODAL ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={[baseStyles.overlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <View style={[baseStyles.sheet, { backgroundColor: colors.background }]}>
            <View style={baseStyles.sheetHeader}>
              <Text style={[baseStyles.sheetTitle, { color: colors.textPrimary }]}>{editingItem ? "Edit schedule" : "Add schedule"}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* TITLE */}
              <Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[baseStyles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. Pharmacology Quiz"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              {/* TYPE */}
              <Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setSelectedType(t)}
                      style={[
                        baseStyles.typeChip,
                        { borderColor: colors.cardBorder, backgroundColor: colors.card },
                        selectedType === t && {
                          backgroundColor: TYPE_COLORS[t],
                          borderColor: TYPE_COLORS[t],
                        },
                      ]}
                    >
                      <Text style={[baseStyles.typeChipTxt, selectedType === t && { color: "#fff" }, selectedType !== t && { color: colors.textSecondary }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* COURSE LINK */}
              {courses.length > 0 && (
                <>
                  <Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>Link to course (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedCourseId(null)}
                        style={[baseStyles.typeChip, {
                          borderColor: !selectedCourseId ? colors.primary : colors.cardBorder,
                          backgroundColor: !selectedCourseId ? colors.primaryLight : colors.card,
                        }]}
                      >
                        <Text style={[baseStyles.typeChipTxt, { color: !selectedCourseId ? colors.primary : colors.textSecondary }]}>None</Text>
                      </TouchableOpacity>
                      {courses.map(c => (
                        <TouchableOpacity
                          key={c._id}
                          onPress={() => setSelectedCourseId(c._id)}
                          style={[baseStyles.typeChip, {
                            borderColor: selectedCourseId === c._id ? c.color : colors.cardBorder,
                            backgroundColor: selectedCourseId === c._id ? c.color + "22" : colors.card,
                          }]}
                        >
                          <Text style={[baseStyles.typeChipTxt, { color: selectedCourseId === c._id ? c.color : colors.textSecondary }]}>
                            {c.code || c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* DATE PICKER */}
              <Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>Date *</Text>
              <TouchableOpacity style={[baseStyles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[baseStyles.pickerTxt, { color: colors.textPrimary }]}>
                  {selectedDate.toLocaleDateString([], {
                    weekday: "short", month: "long", day: "numeric", year: "numeric",
                  })}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) setSelectedDate(date);
                  }}
                />
              )}

              {/* TIME PICKER */}
              <Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>Start time *</Text>
              <TouchableOpacity style={[baseStyles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[baseStyles.pickerTxt, { color: colors.textPrimary }]}>{toTimeString(selectedTime)}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, time) => {
                    setShowTimePicker(Platform.OS === "ios");
                    if (time) setSelectedTime(time);
                  }}
                />
              )}
              

{/* WHEN TO REMIND */}
<Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>When to remind</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
  <View style={{ flexDirection: "row", gap: 8 }}>
    {REMIND_OPTIONS.map(opt => (
      <TouchableOpacity
        key={opt.value}
        onPress={() => setRemindMinutes(opt.value)}
        style={[
          baseStyles.typeChip,
          {
            borderColor: remindMinutes === opt.value ? colors.primary : colors.cardBorder,
            backgroundColor: remindMinutes === opt.value ? colors.primaryLight : colors.card,
          },
        ]}
      >
        <Text style={[
          baseStyles.typeChipTxt,
          { color: remindMinutes === opt.value ? colors.primary : colors.textSecondary },
        ]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</ScrollView>
              {/* DESCRIPTION */}
              <Text style={[baseStyles.fieldLbl, { color: colors.textSecondary }]}>Description / notes</Text>
              <TextInput
                style={[baseStyles.input, { height: 75, textAlignVertical: "top", backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="Room 201 · submit via portal..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              {/* URGENT */}
              <TouchableOpacity style={baseStyles.urgRow} onPress={() => setIsUrgent(v => !v)}>
                <View style={[baseStyles.urgBox, { borderColor: colors.primary }, isUrgent && { backgroundColor: colors.primary }]}>
                  {isUrgent && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[baseStyles.urgLbl, { color: colors.textPrimary }]}>Mark as urgent / needs attention</Text>
              </TouchableOpacity>

              {/* NOTIFICATION INFO */}
              <View style={[baseStyles.notifInfo, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Ionicons name="notifications-outline" size={15} color={notifGranted ? "#639922" : "#BA7517"} />
                <Text style={[baseStyles.notifTxt, { color: notifGranted ? "#3B6D11" : "#633806" }]}>
                  {notifGranted
                    ? "Notifications enabled — you'll be alerted at the set time"
                    : "Notifications not granted — enable in phone settings"}
                </Text>
              </View>

              {/* SUBMIT */}
              <TouchableOpacity
                style={[baseStyles.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                onPress={editingItem ? handleUpdate : handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={baseStyles.submitTxt}>{editingItem ? "Save changes" : "Add to schedule"}</Text>}
              </TouchableOpacity>

              {editingItem && (
                <TouchableOpacity
                  style={baseStyles.delModalBtn}
                  onPress={() => { closeModal(); setTimeout(() => handleDelete(editingItem), 300); }}
                >
                  <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                  <Text style={baseStyles.delModalTxt}>Delete this schedule</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>



      {/* ─── OVERVIEW MODAL ─── */}
      <Modal visible={overviewModalVisible} animationType="slide" transparent onRequestClose={closeOverviewModal}>
        <View style={[baseStyles.overlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <View style={[baseStyles.sheet, { backgroundColor: colors.background }]}>
            <View style={baseStyles.sheetHeader}>
              <Text style={[baseStyles.sheetTitle, { color: colors.textPrimary }]}>
                {overviewCategory === "total" && "All Schedules"}
                {overviewCategory === "done" && "Completed Tasks"}
                {overviewCategory === "pending" && "Pending Tasks"}
                {overviewCategory === "overdue" && "Overdue Tasks"}
              </Text>
              <TouchableOpacity onPress={closeOverviewModal}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => {
                let filteredItems: ScheduleItem[] = [];
                
                if (overviewCategory === "total") {
                  filteredItems = items;
                } else if (overviewCategory === "done") {
                  filteredItems = items.filter(i => i.isCompleted);
                } else if (overviewCategory === "pending") {
                  filteredItems = items.filter(i => !i.isCompleted && !isPastDateTime(i.date, i.startTime));
                } else if (overviewCategory === "overdue") {
                  filteredItems = items.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime));
                }

                return filteredItems.length === 0 ? (
                  <View style={baseStyles.empty}>
                    <Ionicons name={overviewCategory === "done" ? "checkmark-circle-outline" : overviewCategory === "overdue" ? "warning-outline" : "list-outline"} size={40} color={colors.primaryDark} />
                    <Text style={[baseStyles.emptyTxt, { color: colors.textSecondary }]}>
                      {overviewCategory === "total" && "No schedules yet"}
                      {overviewCategory === "done" && "No completed tasks yet"}
                      {overviewCategory === "pending" && "No pending tasks"}
                      {overviewCategory === "overdue" && "No overdue tasks"}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {filteredItems.map((item, idx) => (
                      <TouchableOpacity
                        key={`${item._id}-${idx}`}
                        onPress={() => {
  closeOverviewModal();
  setTimeout(() => openDetail(item), 300);
}}
                        activeOpacity={0.7}
                      >
                        <ScheduleCard
                          item={item}
                          isOverdue={overviewCategory === "overdue" && !item.isCompleted && isPastDateTime(item.date, item.startTime)}
                          onEdit={() => {
                            // Disable edit for completed items and overdue incomplete items
                            if (item.isCompleted || (!item.isCompleted && isPastDateTime(item.date, item.startTime))) {
                              return;
                            }
                            closeOverviewModal();
                            setTimeout(() => openEdit(item), 300);
                          }}
                          onDelete={() => {
                            closeOverviewModal();
                            setTimeout(() => handleDelete(item), 300);
                          }}
                          onToggleComplete={() => {
                            toggleComplete(item);
                          }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
             <ScheduleDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors}
        readOnly={false}
      />         
    </>
  );
}


const baseStyles = StyleSheet.create({
  screen:       { flex: 1, padding: 16 },
  loader:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:    { fontSize: 14 },
  greetRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingTop: 8 },
  greetSub:     { fontSize: 13 },
  greetName:    { fontSize: 20, fontWeight: "500" },
  avatar:       { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFE4EC", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarTxt:    { fontSize: 13, fontWeight: "500" },
  sec:          { fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  ovRow:        { flexDirection: "row", gap: 10, marginBottom: 10 },
  ovCard:       { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 12, alignItems: "center" },
  ovNum:        { fontSize: 22, fontWeight: "500" },
  ovLbl:        { fontSize: 11, marginTop: 4 },
  progMeta:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progLbl:      { fontSize: 11 },
  progPct:      { fontSize: 11, fontWeight: "500" },
  progWrap:     { height: 6, borderRadius: 6, overflow: "hidden", marginBottom: 18 },
  progBar:      { height: 6, borderRadius: 6 },
  nextCard:     { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  nextIco:      { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  nextTitle:    { fontSize: 15, fontWeight: "500", color: "#fff" },
  nextSub:      { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  nextBadgeTxt: { fontSize: 11, color: "#fff" },
  alertCard:    { borderWidth: 0.5, borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  alertTitle:   { fontSize: 13, fontWeight: "500" },
  alertSub:     { fontSize: 12, marginTop: 2 },
  empty:        { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:     { fontSize: 14 },
  emptyBtn:     { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnTxt:  { color: "#fff", fontSize: 13, fontWeight: "500" },
  quickRow:     { flexDirection: "row", gap: 10 },
  qBtn:         { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 14, alignItems: "center", gap: 6 },
  qBtnTxt:      { fontSize: 12, fontWeight: "500" },
  overlay:      { flex: 1, justifyContent: "flex-end" },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  sheetHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle:   { fontSize: 18, fontWeight: "500" },
  fieldLbl:     { fontSize: 12, fontWeight: "500", marginBottom: 6, marginTop: 4 },
  input:        { borderWidth: 0.5, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14 },
  pickerBtn:    { borderWidth: 0.5, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  pickerTxt:    { flex: 1, fontSize: 14 },
  typeChip:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  typeChipTxt:  { fontSize: 13, fontWeight: "500" },
  urgRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  urgBox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  urgBoxOn:     {},
  urgLbl:       { fontSize: 13 },
  notifInfo:    { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 0.5, borderRadius: 10, padding: 10, marginBottom: 14 },
  notifTxt:     { fontSize: 12, flex: 1, lineHeight: 18 },
  submitBtn:    { borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 10 },
  submitTxt:    { color: "#fff", fontSize: 15, fontWeight: "500" },
  delModalBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  delModalTxt:  { color: "#E24B4A", fontSize: 13 },
  // Detail Modal Styles
  detailTitle:  { fontSize: 20, fontWeight: "600", marginBottom: 4 },
  typePillDetail: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typePillTxtDetail: { fontSize: 12, fontWeight: "500" },
  urgentBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  urgentBadgeTxt: { fontSize: 12, fontWeight: "500", color: "#E24B4A" },
  detailRow:    { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 0.5, borderRadius: 10, padding: 12 },
  detailRowLabel: { fontSize: 11, fontWeight: "500" },
  detailRowValue: { fontSize: 14, fontWeight: "500", marginTop: 2 },
  detailDesc:   { borderWidth: 0.5, borderRadius: 10, padding: 12 },
  detailDescTxt: { fontSize: 14, lineHeight: 20 },
  actionBtnDetail: { borderRadius: 10, padding: 12, alignItems: "center", gap: 6, flexDirection: "row", justifyContent: "center" },
  actionBtnDetailTxt: { fontSize: 13, fontWeight: "500", color: "#fff" },
  delDetailBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 14 },
  delDetailTxt:  { color: "#E24B4A", fontSize: 13, fontWeight: "500" },
  overdueWarning: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  overdueWarningTxt: { fontSize: 13, fontWeight: "500", flex: 1 },
});