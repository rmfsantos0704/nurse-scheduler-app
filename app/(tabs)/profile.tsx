import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Image,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useTheme, ColorScheme } from "../../context/ThemeContext";
// Install: npx expo install expo-image-picker

type ProfileData = {
  name: string;
  course: string;
  year: string;
  section: string;
  school: string;
  avatar: string | null;
};

const SCHEMES: { key: ColorScheme; label: string; color: string }[] = [
  { key: "pink",   label: "Rose",   color: "#D4537E" },
  { key: "blue",   label: "Ocean",  color: "#378ADD" },
  { key: "purple", label: "Violet", color: "#7F77DD" },
  { key: "teal",   label: "Teal",   color: "#1D9E75" },
  { key: "green",  label: "Forest", color: "#639922" },
];

const DEFAULT: ProfileData = {
  name: "Maria Santos", course: "BS Nursing",
  year: "3rd Year", section: "Section A", school: "", avatar: null,
};

const FAQ = [
  {
    q: "How do I schedule a new task?",
    a: "Tap the '+' button on the Home tab or use the Calendar tab to add duties, classes, quizzes, and reviews.",
  },
  {
    q: "Can I get notifications for urgent tasks?",
    a: "Yes! Mark tasks as urgent in the schedule, and they'll appear in the Reminders tab and send you notifications.",
  },
  {
    q: "How do I change my color theme?",
    a: "Go to your Profile, scroll to Appearance, and select your preferred color theme. Changes apply instantly.",
  },
  {
    q: "How can I switch between light and dark mode?",
    a: "In your Profile under Appearance, use the toggle switch to switch between Light and Dark modes.",
  },
  {
    q: "Can I edit my profile information?",
    a: "Yes! In the Profile tab, tap the 'Edit' button to update your name, school, course, year level, and section.",
  },
  {
    q: "What do the task status icons mean?",
    a: "✓ Completed: Done | ⏱ Pending: Not started | ⚠ Urgent: High priority | These help you track progress.",
  },
  {
    q: "How do I delete a schedule entry?",
    a: "Swipe left on any task in the Calendar or Home tab to reveal the delete option.",
  },
  {
    q: "Does the app work offline?",
    a: "Yes! All your schedules are stored locally. Changes sync when you have internet connection.",
  },
];

export default function Profile() {
  const { colors, mode, scheme, toggleMode, setScheme } = useTheme();
  const [profile, setProfile] = useState<ProfileData>(DEFAULT);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(DEFAULT);
  const [statsModal, setStatsModal] = useState(false);
  const [faqModal, setFaqModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("profileData").then(v => {
      if (v) { const p = JSON.parse(v); setProfile(p); setDraft(p); }
    });
  }, []);

  const saveProfile = async () => {
    setProfile(draft);
    await AsyncStorage.setItem("profileData", JSON.stringify(draft));
    setEditing(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access in settings to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setDraft(d => ({ ...d, avatar: uri }));
      setProfile(d => ({ ...d, avatar: uri }));
      await AsyncStorage.setItem("profileData", JSON.stringify({ ...profile, avatar: uri }));
    }
  };

  const testOnboarding = async () => {
    Alert.alert("Test Onboarding?", "This will show the onboarding flow again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          await AsyncStorage.removeItem("onboardingDone");
          router.replace("/onboarding");
        },
      },
    ]);
  };

  const initials = (profile.name || "").split(" ").filter(w => w).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const c = colors;

  return (
    <ScrollView style={[s.screen, { backgroundColor: c.background }]} showsVerticalScrollIndicator={false}>

      {/* AVATAR */}
      <View style={s.avatarSection}>
        <TouchableOpacity onPress={pickImage} style={s.avatarWrap}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={[s.avatarImg, { borderColor: c.primary }]} />
          ) : (
            <View style={[s.avatarPlaceholder, { backgroundColor: c.primaryLight, borderColor: c.primary }]}>
              <Text style={[s.avatarInitials, { color: c.primary }]}>{initials}</Text>
            </View>
          )}
          <View style={[s.cameraBtn, { backgroundColor: c.primary }]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={[s.profileName, { color: c.textPrimary }]}>{profile.name}</Text>
        <Text style={[s.profileSub, { color: c.textSecondary }]}>{profile.course} · {profile.year}</Text>
      </View>

      {/* INFO CARD */}
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={s.cardHeader}>
          <Text style={[s.cardTitle, { color: c.textPrimary }]}>Student info</Text>
          <TouchableOpacity onPress={() => editing ? saveProfile() : setEditing(true)}
            style={[s.editBtn, { backgroundColor: c.primaryLight }]}>
            <Ionicons name={editing ? "checkmark" : "pencil-outline"} size={15} color={c.primary} />
            <Text style={[s.editBtnTxt, { color: c.primary }]}>{editing ? "Save" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        {[
          { label: "Full name",  key: "name"    as keyof ProfileData },
          { label: "Course",     key: "course"  as keyof ProfileData },
          { label: "Year level", key: "year"    as keyof ProfileData },
          { label: "Section",    key: "section" as keyof ProfileData },
          { label: "School",     key: "school"  as keyof ProfileData },
        ].map(({ label, key }) => (
          <View key={key} style={s.fieldRow}>
            <Text style={[s.fieldLbl, { color: c.textSecondary }]}>{label}</Text>
            {editing ? (
              <TextInput
                style={[s.fieldInput, { color: c.textPrimary, borderColor: c.cardBorder, backgroundColor: c.background }]}
                value={draft[key] as string}
                onChangeText={v => setDraft(d => ({ ...d, [key]: v }))}
                placeholderTextColor={c.textSecondary}
              />
            ) : (
              <Text style={[s.fieldVal, { color: c.textPrimary }]}>{profile[key] as string || "—"}</Text>
            )}
          </View>
        ))}
      </View>

      {/* APPEARANCE */}
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[s.cardTitle, { color: c.textPrimary }]}>Appearance</Text>

        {/* Dark mode */}
        <View style={s.rowBetween}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={20} color={c.primary} />
            <Text style={[s.rowLabel, { color: c.textPrimary }]}>
              {mode === "dark" ? "Dark mode" : "Light mode"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleMode}
            style={[s.toggle, { backgroundColor: mode === "dark" ? c.primary : c.primaryLight }]}
          >
            <View style={[s.toggleThumb, {
              backgroundColor: "#fff",
              transform: [{ translateX: mode === "dark" ? 20 : 2 }],
            }]} />
          </TouchableOpacity>
        </View>

        {/* Color scheme */}
        <Text style={[s.subLabel, { color: c.textSecondary }]}>Color theme</Text>
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
              <View style={[s.schemeDot, { backgroundColor: sc.color }]} />
              <Text style={[s.schemeLabel, { color: sc.color }]}>{sc.label}</Text>
              {scheme === sc.key && <Ionicons name="checkmark-circle" size={14} color={sc.color} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* QUICK STATS */}
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[s.cardTitle, { color: c.textPrimary }]}>Quick stats</Text>
        <View style={s.statsRow}>
          {[
            { label: "Completed", icon: "checkmark-circle-outline", color: "#639922" },
            { label: "Pending",   icon: "time-outline",             color: "#BA7517" },
            { label: "Urgent",    icon: "warning-outline",           color: "#E24B4A" },
          ].map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: c.background, borderColor: c.cardBorder }]}>
              <Ionicons name={st.icon as any} size={22} color={st.color} />
              <Text style={[s.statLbl, { color: c.textSecondary }]}>{st.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* HELPFUL LINKS */}
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[s.cardTitle, { color: c.textPrimary }]}>Help & Settings</Text>
        
        <TouchableOpacity style={[s.helpBtn, { borderColor: c.cardBorder }]} onPress={() => setFaqModal(true)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Ionicons name="help-circle-outline" size={20} color={c.primary} />
            <Text style={[s.helpBtnTxt, { color: c.textPrimary }]}>Frequently Asked Questions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.helpBtn, { borderColor: c.cardBorder }]} onPress={testOnboarding}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Ionicons name="play-circle-outline" size={20} color={c.primary} />
            <Text style={[s.helpBtnTxt, { color: c.textPrimary }]}>Test Onboarding</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 50 }} />

      {/* FAQ MODAL — centered popup */}
      <Modal
        visible={faqModal}
        animationType="fade"
        transparent
        onRequestClose={() => { setFaqModal(false); setExpandedFaq(null); }}
      >
        <View style={s.faqOverlay}>
          <View style={[s.faqSheet, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            {/* Header */}
            <View style={[s.faqSheetHeader, { borderBottomColor: c.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.faqTitle, { color: c.textPrimary }]}>FAQ</Text>
                <Text style={[s.faqSubtitle, { color: c.textSecondary }]}>
                  Tap a question to read the answer
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setFaqModal(false); setExpandedFaq(null); }}
                style={[s.faqCloseBtn, { backgroundColor: c.background }]}
              >
                <Ionicons name="close" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {FAQ.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setExpandedFaq(idx)}
                  style={[
                    s.faqRow,
                    { borderBottomColor: c.cardBorder },
                    idx === FAQ.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[s.faqIconWrap, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="help" size={14} color={c.primary} />
                  </View>
                  <Text style={[s.faqQuestion, { color: c.textPrimary }]} numberOfLines={2}>
                    {item.q}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
                </TouchableOpacity>
              ))}
              <View style={{ height: 8 }} />
            </ScrollView>
          </View>

          {/* Answer popup — appears over FAQ sheet */}
          {expandedFaq !== null && (
            <View style={s.answerOverlay}>
              <View style={[s.answerSheet, { backgroundColor: c.card, borderColor: c.primary }]}>
                <View style={[s.answerHeader, { borderBottomColor: c.cardBorder }]}>
                  <View style={[s.faqIconWrap, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="help-circle" size={14} color={c.primary} />
                  </View>
                  <Text style={[s.answerQ, { color: c.textPrimary, flex: 1 }]} numberOfLines={3}>
                    {FAQ[expandedFaq].q}
                  </Text>
                </View>
                <Text style={[s.answerTxt, { color: c.textPrimary }]}>
                  {FAQ[expandedFaq].a}
                </Text>
                <TouchableOpacity
                  style={[s.answerCloseBtn, { backgroundColor: c.primary }]}
                  onPress={() => setExpandedFaq(null)}
                >
                  <Text style={s.answerCloseTxt}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, padding: 16 },
  avatarSection:   { alignItems: "center", paddingTop: 24, paddingBottom: 20 },
  avatarWrap:      { position: "relative", marginBottom: 12 },
  avatarImg:       { width: 90, height: 90, borderRadius: 45, borderWidth: 3 },
  avatarPlaceholder:{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatarInitials:  { fontSize: 28, fontWeight: "500" },
  cameraBtn:       { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  profileName:     { fontSize: 20, fontWeight: "500" },
  profileSub:      { fontSize: 13, marginTop: 4 },
  card:            { borderWidth: 0.5, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle:       { fontSize: 15, fontWeight: "500" },
  editBtn:         { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnTxt:      { fontSize: 13, fontWeight: "500" },
  fieldRow:        { paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.06)" },
  fieldLbl:        { fontSize: 11, fontWeight: "500", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldVal:        { fontSize: 14 },
  fieldInput:      { fontSize: 14, borderWidth: 0.5, borderRadius: 8, padding: 8 },
  rowBetween:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.06)" },
  rowLabel:        { fontSize: 14 },
  toggle:          { width: 44, height: 26, borderRadius: 13, justifyContent: "center", padding: 2 },
  toggleThumb:     { width: 22, height: 22, borderRadius: 11 },
  subLabel:        { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 14, marginBottom: 10 },
  schemeRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  schemeChip:      { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  schemeDot:       { width: 10, height: 10, borderRadius: 5 },
  schemeLabel:     { fontSize: 13, fontWeight: "500" },
  statsRow:        { flexDirection: "row", gap: 10, marginTop: 12 },
  statCard:        { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 12, alignItems: "center", gap: 6 },
  statLbl:         { fontSize: 11 },
  helpBtn:         { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: 0.5, paddingRight: 4 },
  helpBtnTxt:      { fontSize: 14, fontWeight: "500" },
  faqOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  faqSheet:        { width: "100%", borderRadius: 20, borderWidth: 0.5, overflow: "hidden" },
  faqSheetHeader:  { flexDirection: "row", alignItems: "flex-start", padding: 16, borderBottomWidth: 0.5, gap: 10 },
  faqTitle:        { fontSize: 18, fontWeight: "600" },
  faqSubtitle:     { fontSize: 12, marginTop: 2 },
  faqCloseBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  faqRow:          { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 0.5 },
  faqIconWrap:     { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  faqQuestion:     { flex: 1, fontSize: 13, fontWeight: "500" },
  answerOverlay:   { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  answerSheet:     { width: "100%", borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 14 },
  answerHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingBottom: 12, borderBottomWidth: 0.5 },
  answerQ:         { fontSize: 13, fontWeight: "600" },
  answerTxt:       { fontSize: 14, lineHeight: 22 },
  answerCloseBtn:  { borderRadius: 12, padding: 12, alignItems: "center" },
  answerCloseTxt:  { color: "#fff", fontSize: 14, fontWeight: "600" },
});