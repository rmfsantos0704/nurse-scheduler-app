import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const APP_ICON = require("../assets/images/icon.png");

const FEATURES = [
  { icon: "home-outline",          label: "Home",      desc: "Daily overview, progress tracking, and schedule management." },
  { icon: "library-outline",       label: "Courses",   desc: "Manage subjects with teachers, rooms, and class schedules." },
  { icon: "calendar-outline",      label: "Calendar",  desc: "Monthly view of all schedules with day drill-down." },
  { icon: "notifications-outline", label: "Reminders", desc: "Urgent tasks surfaced automatically so nothing slips." },
  { icon: "document-text-outline", label: "Notes",     desc: "Rich text notes with bold, italic, highlight, and photo attachments." },
];

export default function About() {
  const { colors } = useTheme();
  const c = colors;

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.textPrimary }]}>About SnowEd</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App identity */}
        <View style={s.heroSection}>
          <View style={[s.iconWrap, { backgroundColor: c.primaryLight }]}>
            <Image source={APP_ICON} style={s.appIcon} />
          </View>
          <Text style={[s.appName, { color: c.textPrimary }]}>SnowEd</Text>
          <Text style={[s.appTagline, { color: c.textSecondary }]}>
            Your school life, organized.
          </Text>
          <View style={[s.versionPill, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[s.versionTxt, { color: c.textSecondary }]}>Version 1.0.0</Text>
          </View>
        </View>

        {/* Mission */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[s.cardTitle, { color: c.textPrimary }]}>Our mission</Text>
          <Text style={[s.cardBody, { color: c.textSecondary }]}>
            SnowEd is built to help students stay on top of academic life — from tracking classes and assignments to getting smart reminders before deadlines. We believe organized students perform better, stress less, and have more time for what matters.
          </Text>
        </View>

        {/* Features */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[s.cardTitle, { color: c.textPrimary }]}>What's inside</Text>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[s.featureRow, { borderTopColor: c.cardBorder }, i === 0 && { borderTopWidth: 0 }]}
            >
              <View style={[s.featureIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name={f.icon as any} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.featureLabel, { color: c.textPrimary }]}>{f.label}</Text>
                <Text style={[s.featureDesc, { color: c.textSecondary }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Built with */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[s.cardTitle, { color: c.textPrimary }]}>Built with</Text>
          {[
            { label: "React Native + Expo",           desc: "Cross-platform mobile framework"    },
            { label: "Expo Router",                   desc: "File-based navigation"              },
            { label: "SQLite (expo-sqlite)",          desc: "Offline-first local database"       }, // ✅ replaced MongoDB Atlas
            { label: "Node.js + Express",             desc: "Backend API server"                 },
            { label: "react-native-pell-rich-editor", desc: "Rich text editing for Notes"        },
          ].map((t, i) => (
            <View
              key={t.label}
              style={[s.techRow, { borderTopColor: c.cardBorder }, i === 0 && { borderTopWidth: 0 }]}
            >
              <Text style={[s.techLabel, { color: c.textPrimary }]}>{t.label}</Text>
              <Text style={[s.techDesc, { color: c.textSecondary }]}>{t.desc}</Text>
            </View>
          ))}
        </View>

        {/* Footer note */}
        <Text style={[s.footer, { color: c.textSecondary }]}>
          Made with ❤️ for students everywhere.{"\n"}SnowEd © 2026 {/* ✅ updated year */}
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 56 : 36, paddingBottom: 14, borderBottomWidth: 0.5 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 17, fontWeight: "600" },
  heroSection:  { alignItems: "center", paddingTop: 36, paddingBottom: 28, gap: 8 },
  iconWrap:     { width: 96, height: 96, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  appIcon:      { width: 76, height: 76, borderRadius: 18 },
  appName:      { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  appTagline:   { fontSize: 15 },
  versionPill:  { borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  versionTxt:   { fontSize: 12 },
  card:         { borderWidth: 0.5, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, overflow: "hidden" },
  cardTitle:    { fontSize: 15, fontWeight: "600", padding: 16, paddingBottom: 12 },
  cardBody:     { fontSize: 14, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
  featureRow:   { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderTopWidth: 0.5 },
  featureIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featureLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  featureDesc:  { fontSize: 12, lineHeight: 17 },
  techRow:      { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5 },
  techLabel:    { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  techDesc:     { fontSize: 12 },
  footer:       { fontSize: 13, textAlign: "center", lineHeight: 22, paddingVertical: 16 },
});