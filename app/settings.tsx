import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, ColorScheme } from "../context/ThemeContext";

const SCHEMES: { key: ColorScheme; label: string; color: string }[] = [
  { key: "pink",   label: "Rose",   color: "#D4537E" },
  { key: "blue",   label: "Ocean",  color: "#378ADD" },
  { key: "purple", label: "Violet", color: "#7F77DD" },
  { key: "teal",   label: "Teal",   color: "#1D9E75" },
  { key: "green",  label: "Forest", color: "#639922" },
];

const FAQ = [
  { q: "How do I add a schedule?",           a: "Tap the + button on the Home tab to add classes, quizzes, activities, and more." },
  { q: "What are urgent reminders?",         a: "Mark any schedule as urgent when adding it — it appears in the Reminders tab." },
  { q: "How do I change my color theme?",    a: "Scroll to Appearance below and choose a theme. Changes apply instantly." },
  { q: "Can I link a schedule to a course?", a: "Yes — when adding a schedule, scroll to 'Link to course' and select one." },
  { q: "How do I delete a schedule?",        a: "Tap any schedule card to open details, then tap the delete button." },
  { q: "How do notes work?",                 a: "Open the Notes tab to create, edit, and search notes. You can attach photos too." },
  { q: "What does bold/italic do in Notes?", a: "Select text in the note editor, then tap B, I, U, or the highlight button in the toolbar." },
];

export default function Settings() {
  const { colors, mode, scheme, toggleMode, setScheme } = useTheme();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const resetOnboarding = () => {
    require("react-native").Alert.alert(
      "Replay onboarding",
      "This will show the setup flow again on next launch.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem("onboardingDone");
          router.replace("/onboarding");
        }},
      ]
    );
  };

  const c = colors;

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.textPrimary }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── APPEARANCE ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Appearance</Text>
          </View>

          {/* Dark / light toggle */}
          <View style={[s.row, { borderTopColor: c.cardBorder }]}>
            <View style={s.rowLeft}>
              <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={20} color={c.primary} />
              <Text style={[s.rowLabel, { color: c.textPrimary }]}>
                {mode === "dark" ? "Dark mode" : "Light mode"}
              </Text>
            </View>
            <Switch
              value={mode === "dark"}
              onValueChange={toggleMode}
              trackColor={{ false: c.primaryLight, true: c.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Color scheme */}
          <View style={[s.row, { borderTopColor: c.cardBorder, flexDirection: "column", alignItems: "flex-start", gap: 12 }]}>
            <Text style={[s.rowLabel, { color: c.textPrimary }]}>Color theme</Text>
            <View style={s.schemeRow}>
              {SCHEMES.map(sc => (
                <TouchableOpacity
                  key={sc.key}
                  onPress={() => setScheme(sc.key)}
                  style={[s.schemeChip, {
                    backgroundColor: sc.color + "22",
                    borderColor: scheme === sc.key ? sc.color : "transparent",
                    borderWidth: scheme === sc.key ? 2 : 1,
                  }]}
                >
                  <View style={{ width: 20, height: 20 }}>
                    <View style={[s.schemeDot, { backgroundColor: sc.color }]} />
                    {scheme === sc.key && (
                      <View style={[s.schemeDotCheck, { backgroundColor: "rgba(0,0,0,0.28)" }]}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[s.schemeLabel, { color: sc.color }]}>{sc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── FAQ ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Help & FAQ</Text>
          </View>
          {FAQ.map((item, idx) => (
            <View key={idx}>
              <TouchableOpacity
                style={[s.faqRow, { borderTopColor: c.cardBorder }]}
                onPress={() => setFaqOpen(faqOpen === idx ? null : idx)}
              >
                <Text style={[s.faqQ, { color: c.textPrimary }]}>{item.q}</Text>
                <Ionicons
                  name={faqOpen === idx ? "chevron-up" : "chevron-down"}
                  size={16} color={c.textSecondary}
                />
              </TouchableOpacity>
              {faqOpen === idx && (
                <View style={[s.faqAnswer, { backgroundColor: c.primaryLight }]}>
                  <Text style={[s.faqA, { color: c.textPrimary }]}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── ADVANCED ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Advanced</Text>
          </View>
          <TouchableOpacity
            style={[s.row, { borderTopColor: c.cardBorder }]}
            onPress={resetOnboarding}
          >
            <View style={s.rowLeft}>
              <Ionicons name="refresh-circle-outline" size={20} color="#BA7517" />
              <Text style={[s.rowLabel, { color: "#BA7517" }]}>Replay onboarding</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1 },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 56 : 36, paddingBottom: 14, borderBottomWidth: 0.5 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 17, fontWeight: "600" },
  card:           { borderWidth: 0.5, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, marginTop: 14, overflow: "hidden" },
  cardHeaderPad:  { paddingHorizontal: 16, paddingVertical: 14 },
  cardTitle:      { fontSize: 15, fontWeight: "600" },
  row:            { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft:        { flexDirection: "row", alignItems: "center", gap: 10 },
  rowLabel:       { fontSize: 14 },
  schemeRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  schemeChip:     { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  schemeDot:      { position: "absolute", width: 20, height: 20, borderRadius: 10 },
  schemeDotCheck: { position: "absolute", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  schemeLabel:    { fontSize: 13, fontWeight: "500" },
  faqRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 13 },
  faqQ:           { fontSize: 13, fontWeight: "500", flex: 1, marginRight: 8 },
  faqAnswer:      { paddingHorizontal: 16, paddingVertical: 12 },
  faqA:           { fontSize: 13, lineHeight: 20 },
});