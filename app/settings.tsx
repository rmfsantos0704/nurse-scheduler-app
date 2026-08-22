import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Platform, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useTheme, ColorScheme } from "../context/ThemeContext";

const SCHEMES: { key: ColorScheme; label: string; color: string }[] = [
  { key: "pink",   label: "Rose",   color: "#D4537E" },
  { key: "blue",   label: "Ocean",  color: "#378ADD" },
  { key: "purple", label: "Violet", color: "#7F77DD" },
  { key: "teal",   label: "Teal",   color: "#1D9E75" },
  { key: "green",  label: "Forest", color: "#639922" },
];

const FAQ = [
  // ── Top 4 always visible ──────────────────────────────────────────────
  {
    q: "How do I add a schedule?",
    a: "Tap the + button on the Home tab. Fill in the title, type, date, time, and optionally link a course, then tap Save.",
  },
  {
    q: "Why isn't my schedule showing on Home?",
    a: "Home only shows today's schedules. For other dates, use the Calendar tab or tap 'Total' in the overview cards.",
  },
  {
    q: "How do urgent reminders work?",
    a: "Toggle 'Mark as urgent' when adding a schedule. Urgent tasks appear in the Reminders tab and trigger a high-priority notification.",
  },
  {
    q: "How do I delete multiple schedules?",
    a: "On the Home tab tap 'Select' next to 'Schedule today', pick the cards you want, then tap Delete. Long-pressing a card also enters selection mode.",
  },

  // ── Hidden behind 'Show more' ─────────────────────────────────────────
  {
    q: "What are the schedule types?",
    a: "Quiz, Activity, Review, Class, Duty, Study, and General. Each has its own color for quick identification.",
  },
  {
    q: "Can I edit a schedule after creating it?",
    a: "Yes, as long as it isn't overdue or completed. Tap the card to open details, then tap Edit.",
  },
  {
    q: "How does 'When to remind' work?",
    a: "Choose how early you want a notification — from 'At start time' up to '1 day before'. The alert fires at your chosen offset before the schedule starts.",
  },
  {
    q: "How do I link a schedule to a course?",
    a: "When adding or editing a schedule, scroll to 'Link to course' and tap a course chip. Linked schedules appear inside that course's detail view.",
  },
  {
    q: "How do I add and manage courses?",
    a: "Go to the Courses tab and tap Add. Fill in the subject name, code, teacher, room, color, and class schedule slots.",
  },
  {
    q: "What does the Calendar tab show?",
    a: "A full monthly calendar with colored dots on days that have schedules. Tap any date to see tasks grouped by overdue, pending, and completed.",
  },
  {
    q: "How do I delete multiple notes?",
    a: "Long-press any note card to enter select mode, tap to pick notes, then tap Delete. Use 'Select all' to pick everything at once.",
  },
  {
    q: "How does the streak work?",
    a: "Your streak increments each day you complete all of today's schedules. Miss a day and it resets to zero.",
  },
];

const ALWAYS_VISIBLE = 4; // number of questions shown before "Show more"

export default function Settings() {
  const { colors, mode, scheme, toggleMode, setScheme } = useTheme();
  const [faqOpen,    setFaqOpen]    = useState<number | null>(null);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [dnd,        setDnd]        = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("dndEnabled").then(v => {
      if (v === "true") setDnd(true);
    });
  }, []);

  const toggleDnd = async (val: boolean) => {
    setDnd(val);
    await AsyncStorage.setItem("dndEnabled", val ? "true" : "false");
    if (val) {
      await Notifications.setNotificationChannelAsync("snowed_default", {
        name: "SnowEd Default",
        importance: Notifications.AndroidImportance.MIN,
        enableVibrate: false,
        sound: undefined,
      }).catch(() => {});
      if (Platform.OS === "ios") {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      Alert.alert("Do Not Disturb on", "SnowEd notifications are muted. Turn off DND to resume them.");
    } else {
      await Notifications.setNotificationChannelAsync("snowed_default", {
        name: "SnowEd Default",
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: true,
      }).catch(() => {});
      Alert.alert("Do Not Disturb off", "Notifications are active again.");
    }
  };

  // Collapse any open answer when hiding extra questions
  const handleShowLess = () => {
    if (faqOpen !== null && faqOpen >= ALWAYS_VISIBLE) setFaqOpen(null);
    setShowAllFaq(false);
  };

  const testOnboarding = () => {
    Alert.alert(
      "Test onboarding",
      "You will return to the onboarding screens. Your saved schedules and notes will stay unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: async () => {
            await AsyncStorage.removeItem("onboardingDone");
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  const visibleFaq = showAllFaq ? FAQ : FAQ.slice(0, ALWAYS_VISIBLE);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16 }}>

        {/* ── APPEARANCE ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Appearance</Text>
          </View>

          <View style={[s.row, { borderTopColor: c.cardBorder }]}>
            <View style={s.rowLeft}>
              <Ionicons name={mode === "dark" ? "moon" : "sunny-outline"} size={20} color={c.primary} />
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

          <View style={[s.schemeSection, { borderTopColor: c.cardBorder }]}>
            <Text style={[s.rowLabel, { color: c.textPrimary, marginBottom: 12 }]}>Color theme</Text>
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

        {/* ── NOTIFICATIONS ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Notifications</Text>
          </View>
          <View style={[s.row, { borderTopColor: c.cardBorder }]}>
            <View style={s.rowLeft}>
              <Ionicons
                name={dnd ? "notifications-off-outline" : "notifications-outline"}
                size={20}
                color={dnd ? "#E24B4A" : c.primary}
              />
              <View>
                <Text style={[s.rowLabel, { color: c.textPrimary }]}>Do Not Disturb</Text>
                <Text style={[s.rowSub, { color: c.textSecondary }]}>
                  {dnd ? "Notifications muted" : "Notifications active"}
                </Text>
              </View>
            </View>
            <Switch
              value={dnd}
              onValueChange={toggleDnd}
              trackColor={{ false: c.primaryLight, true: "#E24B4A" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── FAQ ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>Help & FAQ</Text>
          </View>

          {visibleFaq.map((item, idx) => (
            <View key={idx}>
              <TouchableOpacity
                style={[s.faqRow, { borderTopColor: c.cardBorder }]}
                onPress={() => setFaqOpen(faqOpen === idx ? null : idx)}
                activeOpacity={0.7}
              >
                <Text style={[s.faqQ, { color: c.textPrimary }]}>{item.q}</Text>
                <Ionicons
                  name={faqOpen === idx ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={c.textSecondary}
                />
              </TouchableOpacity>
              {faqOpen === idx && (
                <View style={[s.faqAnswer, { backgroundColor: c.primaryLight }]}>
                  <Text style={[s.faqA, { color: c.textPrimary }]}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}

          {/* ✅ Show more / Show less toggle */}
          <TouchableOpacity
            style={[s.showMoreBtn, { borderTopColor: c.cardBorder }]}
            onPress={showAllFaq ? handleShowLess : () => setShowAllFaq(true)}
            activeOpacity={0.7}
          >
            <Text style={[s.showMoreTxt, { color: c.primary }]}>
              {showAllFaq
                ? "Show less"
                : `Show ${FAQ.length - ALWAYS_VISIBLE} more questions`}
            </Text>
            <Ionicons
              name={showAllFaq ? "chevron-up" : "chevron-down"}
              size={14}
              color={c.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ── ABOUT ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={s.cardHeaderPad}>
            <Text style={[s.cardTitle, { color: c.textPrimary }]}>App info</Text>
          </View>
          <TouchableOpacity
            style={[s.row, { borderTopColor: c.cardBorder }]}
            onPress={() => router.push("/about")}
            activeOpacity={0.7}
          >
            <View style={s.rowLeft}>
              <Ionicons name="information-circle-outline" size={20} color={c.primary} />
              <View>
                <Text style={[s.rowLabel, { color: c.textPrimary }]}>About SnowEd</Text>
                <Text style={[s.rowSub, { color: c.textSecondary }]}>Version, features & credits</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.row, { borderTopColor: c.cardBorder }]}
            onPress={testOnboarding}
            activeOpacity={0.7}
          >
            <View style={s.rowLeft}>
              <Ionicons name="play-circle-outline" size={20} color={c.primary} />
              <View>
                <Text style={[s.rowLabel, { color: c.textPrimary }]}>Test onboarding</Text>
                <Text style={[s.rowSub, { color: c.textSecondary }]}>Preview the welcome screens again</Text>
              </View>
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
  card:           { borderWidth: 0.5, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, overflow: "hidden" },
  cardHeaderPad:  { paddingHorizontal: 16, paddingVertical: 14 },
  cardTitle:      { fontSize: 15, fontWeight: "600" },
  row:            { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowLeft:        { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowLabel:       { fontSize: 14, fontWeight: "500" },
  rowSub:         { fontSize: 12, marginTop: 1 },
  schemeSection:  { borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 14 },
  schemeRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  schemeChip:     { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  schemeDot:      { position: "absolute", width: 20, height: 20, borderRadius: 10 },
  schemeDotCheck: { position: "absolute", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  schemeLabel:    { fontSize: 13, fontWeight: "500" },
  faqRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 0.5, paddingHorizontal: 16, paddingVertical: 13 },
  faqQ:           { fontSize: 13, fontWeight: "500", flex: 1, marginRight: 8 },
  faqAnswer:      { paddingHorizontal: 16, paddingVertical: 12 },
  faqA:           { fontSize: 13, lineHeight: 20 },
  // ✅ Show more / less button
  showMoreBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderTopWidth: 0.5, paddingVertical: 13 },
  showMoreTxt:    { fontSize: 13, fontWeight: "500" },
});