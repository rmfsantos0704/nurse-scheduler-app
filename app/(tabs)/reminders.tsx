import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, TextInput, Alert, ActivityIndicator, RefreshControl, Platform
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "../../services/NotificationService";

const API_URL = "http://192.168.1.49:5000/api"; // 🔥 replace with your IP

type Reminder = {
  _id: string;
  title: string;
  reason: string;
  dateTime: string;   // ISO string
  isNotified: boolean;
  isDone: boolean;
};

const toTimeString = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const toDateString = (d: Date) =>
  d.toISOString().split("T")[0];

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isOverdue = (iso: string) => new Date(iso) < new Date();

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Reminder | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  // Form
  const [fTitle, setFTitle] = useState("");
  const [fReason, setFReason] = useState("");
  const [fDate, setFDate] = useState(new Date());
  const [fTime, setFTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  useFocusEffect(useCallback(() => {
    registerForPushNotifications().then(setNotifGranted);
    fetchReminders();
  }, []));

  const fetchReminders = async () => {
    try {
      const res = await fetch(`${API_URL}/reminders`);
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchReminders(); };

  const resetForm = () => {
    setFTitle(""); setFReason("");
    setFDate(new Date()); setFTime(new Date());
  };

  const buildIso = () => {
    const d = new Date(fDate);
    d.setHours(fTime.getHours(), fTime.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const scheduleReminderNotif = async (id: string, title: string, reason: string, iso: string) => {
    const dt = new Date(iso);
    if (dt <= new Date()) return;
    await Notifications.cancelScheduledNotificationAsync(`rem_${id}`).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: `rem_${id}`,
      content: {
        title: `🔔 Reminder: ${title}`,
        body: reason || "You have a reminder set for now.",
        sound: true,
        badge: 1,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dt,
      },
    });
  };

  const handleCreate = async () => {
    if (!fTitle.trim()) { Alert.alert("Missing field", "Please enter a title."); return; }
    setSaving(true);
    const iso = buildIso();
    try {
      const res = await fetch(`${API_URL}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: fTitle.trim(), reason: fReason.trim(), dateTime: iso, isNotified: false, isDone: false }),
      });
      const created: Reminder = await res.json();
      setReminders(prev => [created, ...prev]);
      if (notifGranted) await scheduleReminderNotif(created._id, created.title, created.reason, created.dateTime);
      closeModal();
    } catch {
      Alert.alert("Error", "Could not save reminder.");
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editingItem || !fTitle.trim()) return;
    setSaving(true);
    const iso = buildIso();
    try {
      const res = await fetch(`${API_URL}/reminders/${editingItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: fTitle.trim(), reason: fReason.trim(), dateTime: iso }),
      });
      const updated: Reminder = await res.json();
      setReminders(prev => prev.map(r => r._id === updated._id ? updated : r));
      if (notifGranted) await scheduleReminderNotif(updated._id, updated.title, updated.reason, updated.dateTime);
      closeModal();
    } catch {
      Alert.alert("Error", "Could not update reminder.");
    } finally { setSaving(false); }
  };

  const toggleDone = async (item: Reminder) => {
    const updated = { ...item, isDone: !item.isDone };
    setReminders(prev => prev.map(r => r._id === item._id ? updated : r));
    await fetch(`${API_URL}/reminders/${item._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: updated.isDone }),
    }).catch(() => {});
    if (updated.isDone) {
      await Notifications.cancelScheduledNotificationAsync(`rem_${item._id}`).catch(() => {});
    }
  };

  const handleDelete = (item: Reminder) => {
    Alert.alert("Delete reminder", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setReminders(prev => prev.filter(r => r._id !== item._id));
          await Notifications.cancelScheduledNotificationAsync(`rem_${item._id}`).catch(() => {});
          await fetch(`${API_URL}/reminders/${item._id}`, { method: "DELETE" }).catch(() => {});
        },
      },
    ]);
  };

  const openCreate = () => { resetForm(); setEditingItem(null); setModalVisible(true); };
  const openEdit = (r: Reminder) => {
    setEditingItem(r);
    setFTitle(r.title); setFReason(r.reason || "");
    const d = new Date(r.dateTime);
    setFDate(d); setFTime(d);
    setModalVisible(true);
  };
  const closeModal = () => { setModalVisible(false); setEditingItem(null); resetForm(); };

  const pending = reminders.filter(r => !r.isDone);
  const done    = reminders.filter(r => r.isDone);

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color="#D4537E" size="large" />
        <Text style={s.loaderTxt}>Loading reminders...</Text>
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
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>Reminders</Text>
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.addBtnTxt}>New</Text>
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-outline" size={44} color="#ED93B1" />
            <Text style={s.emptyTxt}>No reminders yet</Text>
            <Text style={s.emptySub}>Tap "New" to add what, when, and why</Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <View key="pending">
                <Text style={s.sec}>Active reminders</Text>
                {pending.map(r => (
                  <ReminderCard key={r._id} r={r} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleDone} />
                ))}
              </View>
            )}
            {done.length > 0 && (
              <View key="done">
                <Text style={s.sec}>Completed</Text>
                {done.map(r => (
                  <ReminderCard key={r._id} r={r} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleDone} isDone />
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── ADD / EDIT MODAL ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editingItem ? "Edit reminder" : "New reminder"}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#C97C95" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLbl}>What *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Review drug calculations"
                placeholderTextColor="#C97C95"
                value={fTitle}
                onChangeText={setFTitle}
              />

              <Text style={s.fieldLbl}>Why / notes</Text>
              <TextInput
                style={[s.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Exam preparation, ward assignment..."
                placeholderTextColor="#C97C95"
                multiline
                value={fReason}
                onChangeText={setFReason}
              />

              <Text style={s.fieldLbl}>Date *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDate(true)}>
                <Ionicons name="calendar-outline" size={18} color="#D4537E" />
                <Text style={s.pickerTxt}>
                  {fDate.toLocaleDateString([], { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#C97C95" />
              </TouchableOpacity>
              {showDate && (
                <DateTimePicker
                  value={fDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(_, d) => { setShowDate(Platform.OS === "ios"); if (d) setFDate(d); }}
                />
              )}

              <Text style={s.fieldLbl}>Time *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTime(true)}>
                <Ionicons name="time-outline" size={18} color="#D4537E" />
                <Text style={s.pickerTxt}>{toTimeString(fTime)}</Text>
                <Ionicons name="chevron-down" size={16} color="#C97C95" />
              </TouchableOpacity>
              {showTime && (
                <DateTimePicker
                  value={fTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, t) => { setShowTime(Platform.OS === "ios"); if (t) setFTime(t); }}
                />
              )}

              <View style={s.notifInfo}>
                <Ionicons name="notifications-outline" size={15} color={notifGranted ? "#639922" : "#BA7517"} />
                <Text style={[s.notifTxt, { color: notifGranted ? "#3B6D11" : "#633806" }]}>
                  {notifGranted
                    ? "You'll get a notification at the set time"
                    : "Enable notifications in phone settings"}
                </Text>
              </View>

              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.6 }]}
                onPress={editingItem ? handleUpdate : handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitTxt}>{editingItem ? "Save changes" : "Set reminder"}</Text>}
              </TouchableOpacity>

              {editingItem && (
                <TouchableOpacity
                  style={s.delBtn}
                  onPress={() => { closeModal(); setTimeout(() => handleDelete(editingItem), 300); }}
                >
                  <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                  <Text style={s.delBtnTxt}>Delete reminder</Text>
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

function ReminderCard({ r, onEdit, onDelete, onToggle, isDone }: {
  r: Reminder; isDone?: boolean;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
  onToggle: (r: Reminder) => void;
}) {
  const overdue = !isDone && isOverdue(r.dateTime);
  return (
    <View style={[rc.card, isDone && rc.done, overdue && rc.overdue]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={rc.title} numberOfLines={1}>{r.title}</Text>
          {overdue && (
            <View style={rc.overduePill}>
              <Text style={rc.overdueTxt}>Overdue</Text>
            </View>
          )}
        </View>
        {r.reason ? <Text style={rc.reason} numberOfLines={2}>{r.reason}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Ionicons name="time-outline" size={12} color="#C97C95" />
          <Text style={rc.time}>{formatDateTime(r.dateTime)}</Text>
        </View>
      </View>
      <View style={rc.actions}>
        {!isDone && (
          <TouchableOpacity onPress={() => onEdit(r)} style={rc.actionBtn}>
            <Ionicons name="pencil-outline" size={15} color="#C97C95" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete(r)} style={rc.actionBtn}>
          <Ionicons name="trash-outline" size={15} color="#E24B4A" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggle(r)}
          style={[rc.check, isDone && rc.checkDone]}
        >
          {isDone && <Ionicons name="checkmark" size={13} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card:       { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 13, padding: 14, flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "center" },
  done:       { opacity: 0.5 },
  overdue:    { borderColor: "#F09595", backgroundColor: "#FCEBEB" },
  title:      { fontSize: 14, fontWeight: "500", color: "#72243E", flexShrink: 1 },
  reason:     { fontSize: 12, color: "#C97C95", marginTop: 3, lineHeight: 17 },
  time:       { fontSize: 12, color: "#C97C95" },
  overduePill:{ backgroundColor: "#F7C1C1", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  overdueTxt: { fontSize: 10, fontWeight: "500", color: "#791F1F" },
  actions:    { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn:  { padding: 4 },
  check:      { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#D4537E", alignItems: "center", justifyContent: "center" },
  checkDone:  { backgroundColor: "#D4537E" },
});

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: "#FFF5F8", padding: 16 },
  loader:      { flex: 1, backgroundColor: "#FFF5F8", alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:   { fontSize: 14, color: "#C97C95" },
  headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 8 },
  pageTitle:   { fontSize: 22, fontWeight: "500", color: "#72243E" },
  addBtn:      { backgroundColor: "#D4537E", borderRadius: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  addBtnTxt:   { color: "#fff", fontSize: 13, fontWeight: "500" },
  sec:         { fontSize: 11, fontWeight: "500", color: "#C97C95", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  empty:       { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTxt:    { fontSize: 16, fontWeight: "500", color: "#C97C95" },
  emptySub:    { fontSize: 13, color: "#C97C95" },
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: "#FFF5F8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle:  { fontSize: 18, fontWeight: "500", color: "#72243E" },
  fieldLbl:    { fontSize: 12, fontWeight: "500", color: "#C97C95", marginBottom: 6, marginTop: 4 },
  input:       { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 10, padding: 12, fontSize: 14, color: "#72243E", marginBottom: 14 },
  pickerBtn:   { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  pickerTxt:   { flex: 1, fontSize: 14, color: "#72243E" },
  notifInfo:   { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF5F8", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 10, padding: 10, marginBottom: 14 },
  notifTxt:    { fontSize: 12, flex: 1, lineHeight: 18 },
  submitBtn:   { backgroundColor: "#D4537E", borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 10 },
  submitTxt:   { color: "#fff", fontSize: 15, fontWeight: "500" },
  delBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  delBtnTxt:   { color: "#E24B4A", fontSize: 13 },
});