import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TYPES, TYPE_COLORS } from "../constants/scheduleTypes";
import type { ScheduleItem } from "../services/scheduleService";

const REMIND_OPTIONS = [
  { label: "At start time",  value: 0    },
  { label: "5 min before",   value: 5    },
  { label: "15 min before",  value: 15   },
  { label: "30 min before",  value: 30   },
  { label: "1 hour before",  value: 60   },
  { label: "2 hours before", value: 120  },
  { label: "1 day before",   value: 1440 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  editingItem: ScheduleItem | null;
  saving: boolean;
  notifGranted: boolean;
  colors: any;
  // form fields
  title: string; setTitle: (v: string) => void;
  selectedType: string; setSelectedType: (v: any) => void;
  description: string; setDescription: (v: string) => void;
  isUrgent: boolean; setIsUrgent: (v: boolean) => void;
  selectedDate: Date; setSelectedDate: (d: Date) => void;
  selectedTime: Date; setSelectedTime: (d: Date) => void;
  showDatePicker: boolean; setShowDatePicker: (v: boolean) => void;
  showTimePicker: boolean; setShowTimePicker: (v: boolean) => void;
  remindMinutes: number; setRemindMinutes: (v: number) => void;
  courses: { _id: string; name: string; code: string; color: string }[];
  selectedCourseId: string | null; setSelectedCourseId: (v: string | null) => void;
  toTimeString: (d: Date) => string;
  onDelete?: () => void;
};

export function ScheduleFormModal({
  visible, onClose, onSubmit, editingItem, saving, notifGranted, colors,
  title, setTitle, selectedType, setSelectedType,
  description, setDescription, isUrgent, setIsUrgent,
  selectedDate, setSelectedDate, selectedTime, setSelectedTime,
  showDatePicker, setShowDatePicker, showTimePicker, setShowTimePicker,
  remindMinutes, setRemindMinutes,
  courses, selectedCourseId, setSelectedCourseId,
  toTimeString, onDelete,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.overlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
        <View style={[s.sheet, { backgroundColor: colors.background }]}>
          <View style={s.header}>
            <Text style={[s.title2, { color: colors.textPrimary }]}>
              {editingItem ? "Edit schedule" : "Add schedule"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="e.g. Math Quiz" placeholderTextColor={colors.textSecondary}
              value={title} onChangeText={setTitle}
            />

            {/* Type */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t} onPress={() => setSelectedType(t)}
                    style={[s.chip, { borderColor: colors.cardBorder, backgroundColor: colors.card },
                      selectedType === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]}
                  >
                    <Text style={[s.chipTxt, { color: selectedType === t ? "#fff" : colors.textSecondary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Course link */}
            {courses.length > 0 && (
              <>
                <Text style={[s.lbl, { color: colors.textSecondary }]}>Link to course (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setSelectedCourseId(null)}
                      style={[s.chip, { borderColor: !selectedCourseId ? colors.primary : colors.cardBorder, backgroundColor: !selectedCourseId ? colors.primaryLight : colors.card }]}
                    >
                      <Text style={[s.chipTxt, { color: !selectedCourseId ? colors.primary : colors.textSecondary }]}>None</Text>
                    </TouchableOpacity>
                    {courses.map(c => (
                      <TouchableOpacity key={c._id} onPress={() => setSelectedCourseId(c._id)}
                        style={[s.chip, { borderColor: selectedCourseId === c._id ? c.color : colors.cardBorder, backgroundColor: selectedCourseId === c._id ? c.color + "22" : colors.card }]}
                      >
                        <Text style={[s.chipTxt, { color: selectedCourseId === c._id ? c.color : colors.textSecondary }]}>{c.code || c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Date */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>Date *</Text>
            <TouchableOpacity style={[s.picker, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[s.pickerTxt, { color: colors.textPrimary }]}>
                {selectedDate.toLocaleDateString([], { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={selectedDate} mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"} minimumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(Platform.OS === "ios"); if (d) setSelectedDate(d); }} />
            )}

            {/* Time */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>Start time *</Text>
            <TouchableOpacity style={[s.picker, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[s.pickerTxt, { color: colors.textPrimary }]}>{toTimeString(selectedTime)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker value={selectedTime} mode="time" is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, t) => { setShowTimePicker(Platform.OS === "ios"); if (t) setSelectedTime(t); }} />
            )}

            {/* Remind */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>When to remind</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {REMIND_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.value} onPress={() => setRemindMinutes(opt.value)}
                    style={[s.chip, { borderColor: remindMinutes === opt.value ? colors.primary : colors.cardBorder, backgroundColor: remindMinutes === opt.value ? colors.primaryLight : colors.card }]}
                  >
                    <Text style={[s.chipTxt, { color: remindMinutes === opt.value ? colors.primary : colors.textSecondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Description */}
            <Text style={[s.lbl, { color: colors.textSecondary }]}>Notes / description</Text>
            <TextInput style={[s.input, { height: 75, textAlignVertical: "top", backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="Room 201, submit via portal..." placeholderTextColor={colors.textSecondary}
              multiline value={description} onChangeText={setDescription}
            />

            {/* Urgent */}
            <TouchableOpacity style={s.urgRow} onPress={() => setIsUrgent(v => !v)}>
              <View style={[s.urgBox, { borderColor: colors.primary }, isUrgent && { backgroundColor: colors.primary }]}>
                {isUrgent && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[s.urgLbl, { color: colors.textPrimary }]}>Mark as urgent</Text>
            </TouchableOpacity>

            {/* Notif info */}
            <View style={[s.notifRow, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <Ionicons name="notifications-outline" size={15} color={notifGranted ? "#639922" : "#BA7517"} />
              <Text style={[s.notifTxt, { color: notifGranted ? "#3B6D11" : "#633806" }]}>
                {notifGranted ? "Notifications enabled" : "Enable notifications in phone settings"}
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={onSubmit} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitTxt}>{editingItem ? "Save changes" : "Add to schedule"}</Text>}
            </TouchableOpacity>

            {editingItem && onDelete && (
              <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
                <Ionicons name="trash-outline" size={15} color="#E24B4A" />
                <Text style={s.deleteTxt}>Delete schedule</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: "flex-end" },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title2:    { fontSize: 18, fontWeight: "500" },
  lbl:       { fontSize: 12, fontWeight: "500", marginBottom: 6, marginTop: 4 },
  input:     { borderWidth: 0.5, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14 },
  picker:    { borderWidth: 0.5, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  pickerTxt: { flex: 1, fontSize: 14 },
  chip:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipTxt:   { fontSize: 13, fontWeight: "500" },
  urgRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  urgBox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  urgLbl:    { fontSize: 13 },
  notifRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 0.5, borderRadius: 10, padding: 10, marginBottom: 14 },
  notifTxt:  { fontSize: 12, flex: 1, lineHeight: 18 },
  submitBtn: { borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 10 },
  submitTxt: { color: "#fff", fontSize: 15, fontWeight: "500" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  deleteTxt: { color: "#E24B4A", fontSize: 13 },
});