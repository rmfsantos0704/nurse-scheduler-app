import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { courseService } from "../services/courseService";
import { SafeScreen } from "../components/SafeScreen";

type Timeslot = { day: string; startTime: string; endTime: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const COURSE_COLORS = [
  "#378ADD", "#D4537E", "#7F77DD", "#1D9E75",
  "#639922", "#BA7517", "#E24B4A", "#0F6E56",
];

const EMPTY_FORM = {
  name: "", code: "", instructor: "", room: "",
  color: COURSE_COLORS[0], timeslots: [] as Timeslot[],
};

export default function AddCourse() {
  const { colors } = useTheme();
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const addTimeslot = () => {
    setForm(f => ({
      ...f,
      timeslots: [...f.timeslots, { day: "Monday", startTime: "08:00 AM", endTime: "09:00 AM" }],
    }));
  };

  const removeTimeslot = (idx: number) => {
    setForm(f => ({ ...f, timeslots: f.timeslots.filter((_, i) => i !== idx) }));
  };

  const updateTimeslot = (idx: number, key: keyof Timeslot, val: string) => {
    setForm(f => {
      const ts = [...f.timeslots];
      ts[idx] = { ...ts[idx], [key]: val };
      return { ...f, timeslots: ts };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert("Required", "Course name is required."); return; }
    setSaving(true);
    try {
      await courseService.create(form);
      router.back();
    } catch {
      Alert.alert("Error", "Could not save course.");
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
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>New course</Text>
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
        {/* Name */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Course name *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder="e.g. Mathematics"
          placeholderTextColor={colors.textSecondary}
          value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))}
        />

        {/* Code */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Subject code</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder="e.g. MATH 101"
          placeholderTextColor={colors.textSecondary}
          value={form.code}
          onChangeText={v => setForm(f => ({ ...f, code: v }))}
        />

        {/* Instructor */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Instructor</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder="e.g. Prof. Cruz"
          placeholderTextColor={colors.textSecondary}
          value={form.instructor}
          onChangeText={v => setForm(f => ({ ...f, instructor: v }))}
        />

        {/* Room */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Room</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder="e.g. Room 302"
          placeholderTextColor={colors.textSecondary}
          value={form.room}
          onChangeText={v => setForm(f => ({ ...f, room: v }))}
        />

        {/* Color */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Color</Text>
        <View style={s.colorRow}>
          {COURSE_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setForm(f => ({ ...f, color: c }))}
              style={[s.colorDot, {
                backgroundColor: c,
                borderWidth: form.color === c ? 3 : 0,
                borderColor: "#fff",
              }]}
            >
              {form.color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Timeslots */}
        <View style={s.timeslotHeader}>
          <Text style={[s.label, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
            Class schedule
          </Text>
          <TouchableOpacity
            onPress={addTimeslot}
            style={[s.tsAddBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[s.tsAddTxt, { color: colors.primary }]}>Add slot</Text>
          </TouchableOpacity>
        </View>

        {form.timeslots.map((ts, idx) => (
          <View
            key={idx}
            style={[s.tsRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            {/* Day chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {DAYS.map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => updateTimeslot(idx, "day", d)}
                    style={[s.dayChip, {
                      backgroundColor: ts.day === d ? form.color : colors.background,
                      borderColor:     ts.day === d ? form.color : colors.cardBorder,
                    }]}
                  >
                    <Text style={[s.dayChipTxt, { color: ts.day === d ? "#fff" : colors.textSecondary }]}>
                      {d.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {/* Time inputs */}
            <View style={s.tsTimeRow}>
              <TextInput
                style={[s.tsTimeInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="08:00 AM"
                placeholderTextColor={colors.textSecondary}
                value={ts.startTime}
                onChangeText={v => updateTimeslot(idx, "startTime", v)}
              />
              <Text style={[s.tsTimeSep, { color: colors.textSecondary }]}>→</Text>
              <TextInput
                style={[s.tsTimeInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="09:30 AM"
                placeholderTextColor={colors.textSecondary}
                value={ts.endTime}
                onChangeText={v => updateTimeslot(idx, "endTime", v)}
              />
              <TouchableOpacity onPress={() => removeTimeslot(idx)} style={s.tsRemoveBtn}>
                <Ionicons name="close-circle" size={20} color="#E24B4A" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, padding: 16 },
  header:        { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: "600" },
  saveBtn:       { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  saveBtnTxt:    { color: "#fff", fontSize: 14, fontWeight: "500" },
  label:         { fontSize: 12, fontWeight: "500", marginBottom: 6, marginTop: 12 },
  input:         { borderWidth: 0.5, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 2 },
  colorRow:      { flexDirection: "row", gap: 10, marginBottom: 4, flexWrap: "wrap" },
  colorDot:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  timeslotHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 10 },
  tsAddBtn:      { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  tsAddTxt:      { fontSize: 12, fontWeight: "500" },
  tsRow:         { borderWidth: 0.5, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  tsTimeRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  tsTimeInput:   { flex: 1, borderWidth: 0.5, borderRadius: 8, padding: 8, fontSize: 13 },
  tsTimeSep:     { fontSize: 14 },
  tsRemoveBtn:   { padding: 2 },
  dayChip:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dayChipTxt:    { fontSize: 11, fontWeight: "500" },
});