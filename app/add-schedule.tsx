import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Switch,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useCourses } from "../hooks/useCourses";
import { useNotifications } from "../hooks/useNotification";
import { scheduleService } from "../services/scheduleService";
import { scheduleActivityNotification } from "../services/NotificationService";
import { SafeScreen } from "../components/SafeScreen";
import { toTimeString, toDateString, buildDateTime } from "../utils/dateUtils";
import type { ScheduleType } from "../constants/scheduleTypes";
import DateTimePicker from "@react-native-community/datetimepicker";

const TYPES: ScheduleType[] = [
  "Class", "Quiz", "Activity", "Review", "Duty", "Study", "General",
];

const TYPE_COLORS: Record<string, string> = {
  Quiz: "#BA7517", Activity: "rgb(31,160,160)", Review: "#7F77DD",
  Class: "#c5cf08", Duty: "#D4537E", Study: "#378ADD", General: "#21a702",
};

const REMIND_OPTIONS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
];

export default function AddSchedule() {
  const { colors, scheme } = useTheme();
  const { courses } = useCourses();
  const { granted: notifGranted } = useNotifications();

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
  const [saving,           setSaving]           = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a title."); return; }
    setSaving(true);
    const timeStr = toTimeString(selectedTime);
    const dateStr = toDateString(selectedDate);
    try {
      const created = await scheduleService.create({
        title: title.trim(), type: selectedType, date: dateStr,
        startTime: timeStr, description: description.trim(),
        isUrgent, isCompleted: false, courseId: selectedCourseId,
        reminderMinutesBefore: remindMinutes,
      });
      if (notifGranted) {
        const dt      = buildDateTime(dateStr, timeStr);
        const trigger = new Date(dt.getTime() - remindMinutes * 60000);
        await scheduleActivityNotification(
          created._id, created.title, created.type,
          created.description ?? "", trigger > new Date() ? trigger : dt,
          created.isUrgent ?? false, scheme
        );
      }
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeScreen edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>New schedule</Text>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnTxt}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[s.screen, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder="e.g. Final exam review"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Type */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
          {TYPES.map(t => {
            const active = selectedType === t;
            const col    = TYPE_COLORS[t] ?? colors.primary;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedType(t)}
                style={[s.typeChip, {
                  backgroundColor: active ? col : colors.card,
                  borderColor:     active ? col : colors.cardBorder,
                }]}
              >
                <Text style={[s.typeChipTxt, { color: active ? "#fff" : colors.textSecondary }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Date</Text>
        <TouchableOpacity
          style={[s.inputRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setShowDatePicker(v => !v)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={[s.inputRowTxt, { color: colors.textPrimary }]}>
            {selectedDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(_, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }}
          />
        )}

        {/* Time */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Start time</Text>
        <TouchableOpacity
          style={[s.inputRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setShowTimePicker(v => !v)}
        >
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={[s.inputRowTxt, { color: colors.textPrimary }]}>
            {toTimeString(selectedTime)}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={(_, t) => { setShowTimePicker(false); if (t) setSelectedTime(t); }}
          />
        )}

        {/* Description */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[s.input, s.multiline, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder="Optional notes..."
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Urgent */}
        <View style={[s.switchRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.switchLabel, { color: colors.textPrimary }]}>Mark as urgent</Text>
            <Text style={[s.switchSub, { color: colors.textSecondary }]}>Highlights this item for attention</Text>
          </View>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: colors.cardBorder, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Reminder */}
        {notifGranted && (
          <>
            <Text style={[s.label, { color: colors.textSecondary }]}>Remind me before</Text>
            <View style={s.remindRow}>
              {REMIND_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setRemindMinutes(opt.value)}
                  style={[s.remindChip, {
                    backgroundColor: remindMinutes === opt.value ? colors.primary : colors.card,
                    borderColor:     remindMinutes === opt.value ? colors.primary : colors.cardBorder,
                  }]}
                >
                  <Text style={[s.remindChipTxt, { color: remindMinutes === opt.value ? "#fff" : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Course */}
        {courses.length > 0 && (
          <>
            <Text style={[s.label, { color: colors.textSecondary }]}>Linked course</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
              <TouchableOpacity
                onPress={() => setSelectedCourseId(null)}
                style={[s.typeChip, {
                  backgroundColor: selectedCourseId === null ? colors.primary : colors.card,
                  borderColor:     selectedCourseId === null ? colors.primary : colors.cardBorder,
                }]}
              >
                <Text style={[s.typeChipTxt, { color: selectedCourseId === null ? "#fff" : colors.textSecondary }]}>
                  None
                </Text>
              </TouchableOpacity>
              {courses.map(c => (
                <TouchableOpacity
                  key={c._id}
                  onPress={() => setSelectedCourseId(c._id)}
                  style={[s.typeChip, {
                    backgroundColor: selectedCourseId === c._id ? c.color : colors.card,
                    borderColor:     selectedCourseId === c._id ? c.color : colors.cardBorder,
                  }]}
                >
                  <Text style={[s.typeChipTxt, { color: selectedCourseId === c._id ? "#fff" : colors.textSecondary }]}>
                    {c.code || c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, padding: 16 },
  header:       { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: "600" },
  saveBtn:      { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  saveBtnTxt:   { color: "#fff", fontSize: 14, fontWeight: "500" },
  label:        { fontSize: 12, fontWeight: "500", marginBottom: 6, marginTop: 12 },
  input:        { borderWidth: 0.5, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 2 },
  multiline:    { minHeight: 80, textAlignVertical: "top" },
  inputRow:     { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 0.5, borderRadius: 10, padding: 12, marginBottom: 2 },
  inputRowTxt:  { fontSize: 14, flex: 1 },
  typeRow:      { marginBottom: 4 },
  typeChip:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  typeChipTxt:  { fontSize: 13, fontWeight: "500" },
  switchRow:    { flexDirection: "row", alignItems: "center", borderWidth: 0.5, borderRadius: 12, padding: 14, marginTop: 12 },
  switchLabel:  { fontSize: 14, fontWeight: "500" },
  switchSub:    { fontSize: 12, marginTop: 2 },
  remindRow:    { flexDirection: "row", gap: 8, marginBottom: 4 },
  remindChip:   { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  remindChipTxt:{ fontSize: 13, fontWeight: "500" },
});