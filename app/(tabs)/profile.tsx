import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Image,
} from "react-native";
import { useState, useEffect } from "react";
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

export default function Profile() {
  const { colors, mode, scheme, toggleMode, setScheme } = useTheme();
  const [profile, setProfile] = useState<ProfileData>(DEFAULT);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(DEFAULT);
  const [statsModal, setStatsModal] = useState(false);

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

  const initials = profile.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
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

      {/* SIGN OUT placeholder */}
      <TouchableOpacity
        style={[s.signOutBtn, { borderColor: "#E24B4A" }]}
        onPress={() => Alert.alert("Sign out", "Sign out feature coming soon.")}
      >
        <Ionicons name="log-out-outline" size={18} color="#E24B4A" />
        <Text style={s.signOutTxt}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
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
  signOutBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 4 },
  signOutTxt:      { color: "#E24B4A", fontSize: 14, fontWeight: "500" },
});