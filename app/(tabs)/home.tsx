import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Platform
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotifications,
  scheduleActivityNotification,
  cancelNotification} from "../../services/NotificationService";

const API_URL = "http://192.168.1.49:5000/api"; // 🔥 replace with your IP

type ScheduleType = "Quiz" | "Activity" | "Review" | "Class" | "Duty" | "Study";

type ScheduleItem = {
  _id: string;
  title: string;
  type: ScheduleType;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  isUrgent?: boolean;
};

const TYPE_COLORS: Record<string, string> = {
  Quiz: "#BA7517", Activity: "#639922", Review: "#7F77DD",
  Class: "#378ADD", Duty: "#D4537E", Study: "#378ADD",
};
const TYPE_BG: Record<string, string> = {
  Quiz: "#FAEEDA", Activity: "#EAF3DE", Review: "#EEEDFE",
  Class: "#E6F1FB", Duty: "#FBEAF0", Study: "#E6F1FB",
};
const TYPES: ScheduleType[] = ["Quiz", "Activity", "Review", "Class", "Duty", "Study"];

const toTimeString = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const toDateString = (d: Date) =>
  d.toISOString().split("T")[0];

const buildDateTime = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const cleaned = timeStr.replace(/\./g, ":").trim();
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return new Date();
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(year, month - 1, day, hours, minutes);
};

export default function Home() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

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

  // ─── INIT NOTIFICATIONS ──────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    registerForPushNotifications().then(setNotifGranted);
    fetchSchedules();

    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, []));

  // ─── FETCH ───────────────────────────────────────────────────────────
  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_URL}/schedules/${today}`);
      const data = await res.json();
      const safe = Array.isArray(data) ? data : [];
      safe.sort((a: ScheduleItem, b: ScheduleItem) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "")
      );
      setItems(safe);
    } catch {
      Alert.alert("Error", "Could not load schedules. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchSchedules(); };

  // ─── RESET FORM ──────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setSelectedType("Class"); setDescription("");
    setIsUrgent(false);
    setSelectedDate(new Date()); setSelectedTime(new Date());
  };

  // ─── CREATE ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert("Missing field", "Please enter a title."); return; }
    setSaving(true);
    const timeStr = toTimeString(selectedTime);
    const dateStr = toDateString(selectedDate);
    try {
      const res = await fetch(`${API_URL}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), type: selectedType,
          date: dateStr, startTime: timeStr,
          description: description.trim(),
          isUrgent, isCompleted: false,
        }),
      });
      const newItem: ScheduleItem = await res.json();
      setItems(prev =>
        [...prev, newItem].sort((a, b) =>
          (a.startTime ?? "").localeCompare(b.startTime ?? "")
        )
      );
      // Schedule notification
      if (notifGranted) {
        const dt = buildDateTime(dateStr, timeStr);
        await scheduleActivityNotification(
          newItem._id, newItem.title,
          newItem.description || newItem.type, dt
        );
      }
      closeModal();
    } catch {
      Alert.alert("Error", "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  };

  // ─── UPDATE ──────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!title.trim()) { Alert.alert("Missing field", "Please enter a title."); return; }
    setSaving(true);
    const timeStr = toTimeString(selectedTime);
    const dateStr = toDateString(selectedDate);
    try {
      const res = await fetch(`${API_URL}/schedules/${editingItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), type: selectedType,
          date: dateStr, startTime: timeStr,
          description: description.trim(), isUrgent,
        }),
      });
      const updated: ScheduleItem = await res.json();
      setItems(prev =>
        prev.map(i => i._id === updated._id ? updated : i)
          .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
      );
      if (notifGranted) {
        const dt = buildDateTime(dateStr, timeStr);
        await scheduleActivityNotification(
          updated._id, updated.title,
          updated.description || updated.type, dt
        );
      }
      closeModal();
    } catch {
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
    setEditingItem(item);
    setTitle(item.title);
    setSelectedType(item.type);
    setDescription(item.description || "");
    setIsUrgent(item.isUrgent || false);
    // Parse existing date/time back into Date objects
    const [y, m, d] = item.date.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));
    setSelectedTime(buildDateTime(item.date, item.startTime));
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    resetForm();
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color="#D4537E" size="large" />
        <Text style={s.loaderTxt}>Loading your schedule...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={s.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4537E" />}
      >
        {/* GREETING */}
        <View style={s.greetRow}>
          <View>
            <Text style={s.greetSub}>{greeting},</Text>
            <Text style={s.greetName}>Maria Santos 👩‍⚕️</Text>
          </View>
          <View style={s.avatar}><Text style={s.avatarTxt}>MS</Text></View>
        </View>

        {/* OVERVIEW */}
        <Text style={s.sec}>Today's overview</Text>
        <View style={s.ovRow}>
          {([["Total", total, "#D4537E"], ["Done", done, "#639922"], ["Pending", total - done, "#BA7517"]] as const).map(([l, n, c]) => (
            <View key={l} style={s.ovCard}>
              <Text style={[s.ovNum, { color: c }]}>{n}</Text>
              <Text style={s.ovLbl}>{l}</Text>
            </View>
          ))}
        </View>
        <View style={s.progMeta}>
          <Text style={s.progLbl}>Progress today</Text>
          <Text style={s.progPct}>{pct}%</Text>
        </View>
        <View style={s.progWrap}>
          <View style={[s.progBar, { width: `${pct}%` as any }]} />
        </View>

        {/* NEXT EVENT */}
        {nextItem && (
          <View key="nextEvent">
            <Text style={s.sec}>Next up</Text>
            <View style={s.nextCard}>
              <View style={s.nextIco}>
                <Ionicons name="time-outline" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.nextTitle}>{nextItem.title}</Text>
                <Text style={s.nextSub}>{nextItem.description || nextItem.type}</Text>
              </View>
              <View style={s.nextBadge}>
                <Text style={s.nextBadgeTxt}>{nextItem.startTime}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ALERTS */}
        {urgentItems.length > 0 && (
          <View key="alerts">
            <Text style={s.sec}>Needs attention</Text>
            {urgentItems.map(item => (
              <View key={item._id} style={s.alertCard}>
                <Ionicons name="warning-outline" size={18} color="#BA7517" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>{item.title}</Text>
                  <Text style={s.alertSub}>{item.description || item.type} · {item.startTime}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SCHEDULE LIST */}
        <Text style={s.sec}>Schedule today</Text>
        {items.length === 0 ? (
          <View key="emptySchedule" style={s.empty}>
            <Ionicons name="calendar-outline" size={40} color="#ED93B1" />
            <Text style={s.emptyTxt}>No schedules yet for today</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
              <Text style={s.emptyBtnTxt}>Add your first task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View key="scheduleList">
            {items.map(item => (
              <View
                key={item._id}
                style={[
                  s.schedItem,
                  item.isUrgent && !item.isCompleted && s.schedUrgent,
                  item.isCompleted && s.schedDone,
                ]}
              >
                <Text style={[s.schedTime, item.isUrgent && !item.isCompleted && { color: "#D4537E" }]}>
                  {item.startTime}
                </Text>
                <View style={[s.dot, { backgroundColor: TYPE_COLORS[item.type] || "#D4537E" }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <Text style={s.schedTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[s.typePill, { backgroundColor: TYPE_BG[item.type] }]}>
                      <Text style={[s.typePillTxt, { color: TYPE_COLORS[item.type] }]}>{item.type}</Text>
                    </View>
                  </View>
                  {item.description ? (
                    <Text style={s.schedSub} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
                <View style={s.actions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn}>
                    <Ionicons name="pencil-outline" size={15} color="#C97C95" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={s.actionBtn}>
                    <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleComplete(item)}
                    style={[s.check, item.isCompleted && s.checkDone]}
                  >
                    {item.isCompleted && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* QUICK ACTIONS */}
        <Text style={s.sec}>Quick actions</Text>
        <View style={s.quickRow}>
          <TouchableOpacity style={s.qBtn} onPress={openCreate}>
            <Ionicons name="add-circle-outline" size={22} color="#D4537E" />
            <Text style={s.qBtnTxt}>Add schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.qBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={22} color="#D4537E" />
            <Text style={s.qBtnTxt}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── ADD / EDIT MODAL ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editingItem ? "Edit schedule" : "Add schedule"}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#C97C95" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* TITLE */}
              <Text style={s.fieldLbl}>Title *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Pharmacology Quiz"
                placeholderTextColor="#C97C95"
                value={title}
                onChangeText={setTitle}
              />

              {/* TYPE */}
              <Text style={s.fieldLbl}>Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setSelectedType(t)}
                      style={[
                        s.typeChip,
                        selectedType === t && {
                          backgroundColor: TYPE_COLORS[t],
                          borderColor: TYPE_COLORS[t],
                        },
                      ]}
                    >
                      <Text style={[s.typeChipTxt, selectedType === t && { color: "#fff" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* DATE PICKER */}
              <Text style={s.fieldLbl}>Date *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#D4537E" />
                <Text style={s.pickerTxt}>
                  {selectedDate.toLocaleDateString([], {
                    weekday: "short", month: "long", day: "numeric", year: "numeric",
                  })}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#C97C95" />
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
              <Text style={s.fieldLbl}>Start time *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={18} color="#D4537E" />
                <Text style={s.pickerTxt}>{toTimeString(selectedTime)}</Text>
                <Ionicons name="chevron-down" size={16} color="#C97C95" />
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

              {/* DESCRIPTION */}
              <Text style={s.fieldLbl}>Description / notes</Text>
              <TextInput
                style={[s.input, { height: 75, textAlignVertical: "top" }]}
                placeholder="Room 201 · submit via portal..."
                placeholderTextColor="#C97C95"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              {/* URGENT */}
              <TouchableOpacity style={s.urgRow} onPress={() => setIsUrgent(v => !v)}>
                <View style={[s.urgBox, isUrgent && s.urgBoxOn]}>
                  {isUrgent && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={s.urgLbl}>Mark as urgent / needs attention</Text>
              </TouchableOpacity>

              {/* NOTIFICATION INFO */}
              <View style={s.notifInfo}>
                <Ionicons name="notifications-outline" size={15} color={notifGranted ? "#639922" : "#BA7517"} />
                <Text style={[s.notifTxt, { color: notifGranted ? "#3B6D11" : "#633806" }]}>
                  {notifGranted
                    ? "Notifications enabled — you'll be alerted at the set time"
                    : "Notifications not granted — enable in phone settings"}
                </Text>
              </View>

              {/* SUBMIT */}
              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.6 }]}
                onPress={editingItem ? handleUpdate : handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitTxt}>{editingItem ? "Save changes" : "Add to schedule"}</Text>}
              </TouchableOpacity>

              {editingItem && (
                <TouchableOpacity
                  style={s.delModalBtn}
                  onPress={() => { closeModal(); setTimeout(() => handleDelete(editingItem), 300); }}
                >
                  <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                  <Text style={s.delModalTxt}>Delete this schedule</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: "#FFF5F8", padding: 16 },
  loader:       { flex: 1, backgroundColor: "#FFF5F8", alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:    { fontSize: 14, color: "#C97C95" },
  greetRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingTop: 8 },
  greetSub:     { fontSize: 13, color: "#C97C95" },
  greetName:    { fontSize: 20, fontWeight: "500", color: "#72243E" },
  avatar:       { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFE4EC", borderWidth: 2, borderColor: "#ED93B1", alignItems: "center", justifyContent: "center" },
  avatarTxt:    { fontSize: 13, fontWeight: "500", color: "#993556" },
  sec:          { fontSize: 11, fontWeight: "500", color: "#C97C95", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  ovRow:        { flexDirection: "row", gap: 10, marginBottom: 10 },
  ovCard:       { flex: 1, backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 12, padding: 12, alignItems: "center" },
  ovNum:        { fontSize: 22, fontWeight: "500" },
  ovLbl:        { fontSize: 11, color: "#C97C95", marginTop: 4 },
  progMeta:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progLbl:      { fontSize: 11, color: "#C97C95" },
  progPct:      { fontSize: 11, fontWeight: "500", color: "#D4537E" },
  progWrap:     { height: 6, backgroundColor: "#FFE4EC", borderRadius: 6, overflow: "hidden", marginBottom: 18 },
  progBar:      { height: 6, backgroundColor: "#D4537E", borderRadius: 6 },
  nextCard:     { backgroundColor: "#D4537E", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  nextIco:      { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  nextTitle:    { fontSize: 15, fontWeight: "500", color: "#fff" },
  nextSub:      { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  nextBadge:    { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  nextBadgeTxt: { fontSize: 11, color: "#fff" },
  alertCard:    { backgroundColor: "#FAEEDA", borderWidth: 0.5, borderColor: "#FAC775", borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  alertTitle:   { fontSize: 13, fontWeight: "500", color: "#633806" },
  alertSub:     { fontSize: 12, color: "#854F0B", marginTop: 2 },
  schedItem:    { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  schedUrgent:  { borderColor: "#D4537E", borderWidth: 1 },
  schedDone:    { opacity: 0.5 },
  schedTime:    { fontSize: 11, fontWeight: "500", color: "#C97C95", width: 48, textAlign: "center" },
  dot:          { width: 9, height: 9, borderRadius: 5 },
  schedTitle:   { fontSize: 14, fontWeight: "500", color: "#72243E", flexShrink: 1 },
  schedSub:     { fontSize: 11, color: "#C97C95", marginTop: 1 },
  typePill:     { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  typePillTxt:  { fontSize: 10, fontWeight: "500" },
  actions:      { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn:    { padding: 4 },
  check:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#D4537E", alignItems: "center", justifyContent: "center" },
  checkDone:    { backgroundColor: "#D4537E" },
  empty:        { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt:     { fontSize: 14, color: "#C97C95" },
  emptyBtn:     { backgroundColor: "#D4537E", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnTxt:  { color: "#fff", fontSize: 13, fontWeight: "500" },
  quickRow:     { flexDirection: "row", gap: 10 },
  qBtn:         { flex: 1, backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#ED93B1", borderRadius: 12, padding: 14, alignItems: "center", gap: 6 },
  qBtnTxt:      { fontSize: 12, fontWeight: "500", color: "#993556" },
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet:        { backgroundColor: "#FFF5F8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  sheetHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle:   { fontSize: 18, fontWeight: "500", color: "#72243E" },
  fieldLbl:     { fontSize: 12, fontWeight: "500", color: "#C97C95", marginBottom: 6, marginTop: 4 },
  input:        { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 10, padding: 12, fontSize: 14, color: "#72243E", marginBottom: 14 },
  pickerBtn:    { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  pickerTxt:    { flex: 1, fontSize: 14, color: "#72243E" },
  typeChip:     { borderWidth: 1, borderColor: "#F4C0D1", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#fff" },
  typeChipTxt:  { fontSize: 13, color: "#C97C95", fontWeight: "500" },
  urgRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  urgBox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#D4537E", alignItems: "center", justifyContent: "center" },
  urgBoxOn:     { backgroundColor: "#D4537E" },
  urgLbl:       { fontSize: 13, color: "#72243E" },
  notifInfo:    { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF5F8", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 10, padding: 10, marginBottom: 14 },
  notifTxt:     { fontSize: 12, flex: 1, lineHeight: 18 },
  submitBtn:    { backgroundColor: "#D4537E", borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 10 },
  submitTxt:    { color: "#fff", fontSize: 15, fontWeight: "500" },
  delModalBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  delModalTxt:  { color: "#E24B4A", fontSize: 13 },
});