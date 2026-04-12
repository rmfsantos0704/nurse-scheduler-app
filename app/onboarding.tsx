import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, Platform, TextInput,
  ScrollView, KeyboardAvoidingView,
} from "react-native";
import { useState, useRef } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BOT_ICON = require("../assets/images/icon.png");

// ─── Color schemes ────────────────────────────────────────────────────────────
const SCHEMES = [
  { key: "pink",   label: "Rose",   primary: "#D4537E", light: "#FFE4EC", dark: "#72243E" },
  { key: "blue",   label: "Ocean",  primary: "#378ADD", light: "#E6F1FB", dark: "#0C447C" },
  { key: "purple", label: "Violet", primary: "#7F77DD", light: "#EEEDFE", dark: "#3C3489" },
  { key: "teal",   label: "Teal",   primary: "#1D9E75", light: "#E1F5EE", dark: "#085041" },
  { key: "green",  label: "Forest", primary: "#639922", light: "#EAF3DE", dark: "#27500A" },
] as const;

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const MODES = [
  { key: "light", label: "Light",  icon: "sunny-outline"  },
  { key: "dark",  label: "Dark",   icon: "moon-outline"   },
] as const;

type SchemeKey = typeof SCHEMES[number]["key"];
type ModeKey   = "light" | "dark";

// ─── Slide types ─────────────────────────────────────────────────────────────
type SlideId = "welcome" | "features" | "setup" | "appearance" | "ready";

const SLIDES: SlideId[] = ["welcome", "features", "setup", "appearance", "ready"];

// ─── Main component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const flatRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  // User info state
  const [name,    setName]    = useState("");
  const [school,  setSchool]  = useState("");
  const [course,  setCourse]  = useState("");
  const [year,    setYear]    = useState("3rd Year");
  const [section, setSection] = useState("");

  // Appearance state
  const [scheme, setScheme] = useState<SchemeKey>("pink");
  const [mode,   setMode]   = useState<ModeKey>("light");

  const current = SCHEMES.find(s => s.key === scheme)!;
  const isLast  = index === SLIDES.length - 1;

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goTo = (i: number) => {
    flatRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const handleNext = () => {
    if (index === 2 && !name.trim()) return; // block if no name
    if (isLast) finish();
    else goTo(index + 1);
  };

  const finish = async () => {
    const profile = { name: name.trim(), school: school.trim(), course: course.trim(), year, section: section.trim(), avatar: null };
    await AsyncStorage.multiSet([
      ["onboardingDone", "true"],
      ["profileData",    JSON.stringify(profile)],
      ["themeScheme",    scheme],
      ["themeMode",      mode],
    ]);
    router.replace("/(tabs)/home");
  };

  // ── Scroll handler ───────────────────────────────────────────────────────────
  const onScroll = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i >= 0 && i < SLIDES.length) setIndex(i);
  };

  // ── Can proceed? ─────────────────────────────────────────────────────────────
  const canNext = !(SLIDES[index] === "setup" && !name.trim());

  // ── Slide content map ────────────────────────────────────────────────────────
  const renderSlide = (id: SlideId) => {
    switch (id) {
      case "welcome":   return <WelcomeSlide   color={current} />;
      case "features":  return <FeaturesSlide  color={current} />;
      case "setup":     return (
        <SetupSlide
          color={current}
          name={name}       setName={setName}
          school={school}   setSchool={setSchool}
          course={course}   setCourse={setCourse}
          year={year}       setYear={setYear}
          section={section} setSection={setSection}
          YEAR_LEVELS={YEAR_LEVELS}
        />
      );
      case "appearance": return (
        <AppearanceSlide
          color={current}
          scheme={scheme}   setScheme={setScheme}
          mode={mode}       setMode={setMode}
          SCHEMES={SCHEMES} MODES={MODES}
        />
      );
      case "ready":     return <ReadySlide color={current} name={name} />;
    }
  };

  return (
    <View style={[s.root, { backgroundColor: current.light + "88" }]}>

      {/* Skip */}
      {!isLast && index < 2 && (
        <TouchableOpacity style={s.skipBtn} onPress={finish}>
          <Text style={[s.skipTxt, { color: current.primary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={id => id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <KeyboardAvoidingView
            style={{ width }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={s.slideScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderSlide(item)}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      />

      {/* Bottom */}
      <View style={[s.bottom, { backgroundColor: "#fff" + "ee" }]}>
        {/* Dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i === index ? current.primary : current.primary + "33",
                  width: i === index ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          style={[
            s.nextBtn,
            { backgroundColor: canNext ? current.primary : current.primary + "55" },
          ]}
          onPress={handleNext}
          disabled={!canNext}
          activeOpacity={0.85}
        >
          <Text style={s.nextTxt}>
            {isLast ? "Enter NurseSched" : index === SLIDES.length - 2 ? "All done" : "Next"}
          </Text>
          <Ionicons
            name={isLast ? "arrow-forward-circle" : "arrow-forward"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={[s.counter, { color: current.primary + "88" }]}>
          {index + 1} of {SLIDES.length}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Welcome
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeSlide({ color }: { color: typeof SCHEMES[number] }) {
  return (
    <View style={sl.wrap}>
      <View style={[sl.iconRing2, { borderColor: color.primary + "18" }]} />
      <View style={[sl.iconRing1, { borderColor: color.primary + "28" }]} />
      <View style={[sl.iconCircle, { backgroundColor: color.light }]}>
        <Image source={BOT_ICON} style={sl.appIcon} />
      </View>

      <View style={[sl.tagPill, { backgroundColor: color.light }]}>
        <Text style={[sl.tag, { color: color.primary }]}>Welcome</Text>
      </View>

      <Text style={sl.title}>{"Your nursing\nschool companion"}</Text>
      <Text style={sl.body}>
        NurseSched helps you stay on top of your duties, classes, quizzes, and reviews — all in one place.
      </Text>

      <View style={[sl.card, { borderColor: color.primary + "25", backgroundColor: color.light + "88" }]}>
        {[
          { icon: "calendar-outline",       text: "Schedule every duty, class & quiz" },
          { icon: "notifications-outline",  text: "Get notified before it starts"     },
          { icon: "warning-outline",        text: "Urgent tasks always front & center" },
          { icon: "person-outline",         text: "Personalized to your profile"       },
        ].map((f, i) => (
          <View
            key={i}
            style={[
              sl.featRow,
              i > 0 && { borderTopWidth: 0.5, borderTopColor: color.primary + "18" },
            ]}
          >
            <View style={[sl.featIcon, { backgroundColor: color.light }]}>
              <Ionicons name={f.icon as any} size={17} color={color.primary} />
            </View>
            <Text style={sl.featTxt}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Features
// ─────────────────────────────────────────────────────────────────────────────
function FeaturesSlide({ color }: { color: typeof SCHEMES[number] }) {
  const features = [
    {
      icon:  "home-outline",
      title: "Home dashboard",
      desc:  "Today's schedule, next event, progress bar, and urgent alerts — all at a glance.",
      bg:    "#E6F1FB",
      ic:    "#378ADD",
    },
    {
      icon:  "calendar-outline",
      title: "Monthly calendar",
      desc:  "View your entire month. Tap any date to see what's scheduled, done, or pending.",
      bg:    "#EEEDFE",
      ic:    "#7F77DD",
    },
    {
      icon:  "notifications-outline",
      title: "Smart reminders",
      desc:  "Schedules marked urgent auto-appear here — sorted overdue, today, upcoming.",
      bg:    "#FCEBEB",
      ic:    "#E24B4A",
    },
    {
      icon:  "person-outline",
      title: "Your profile",
      desc:  "Edit your student info, pick your color theme, and switch light or dark mode.",
      bg:    "#FAEEDA",
      ic:    "#BA7517",
    },
  ];

  return (
    <View style={sl.wrap}>
      <View style={[sl.tagPill, { backgroundColor: color.light }]}>
        <Text style={[sl.tag, { color: color.primary }]}>Features</Text>
      </View>
      <Text style={sl.title}>{"Everything you\nneed in one app"}</Text>
      <Text style={sl.body}>Four tabs, each with a clear purpose.</Text>

      <View style={sl.grid}>
        {features.map((f, i) => (
          <View
            key={i}
            style={[sl.gridCard, { backgroundColor: f.bg + "55", borderColor: f.ic + "22" }]}
          >
            <View style={[sl.gridIcon, { backgroundColor: f.bg }]}>
              <Ionicons name={f.icon as any} size={22} color={f.ic} />
            </View>
            <Text style={[sl.gridTitle, { color: f.ic }]}>{f.title}</Text>
            <Text style={sl.gridDesc}>{f.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Setup
// ─────────────────────────────────────────────────────────────────────────────
function SetupSlide({
  color, name, setName, school, setSchool,
  course, setCourse, year, setYear,
  section, setSection, YEAR_LEVELS,
}: any) {
  return (
    <View style={sl.wrap}>
      <View style={[sl.iconCircleSmall, { backgroundColor: color.light }]}>
        <Ionicons name="person-add-outline" size={32} color={color.primary} />
      </View>

      <View style={[sl.tagPill, { backgroundColor: color.light }]}>
        <Text style={[sl.tag, { color: color.primary }]}>Your profile</Text>
      </View>

      <Text style={sl.title}>{"Let's set up\nyour profile"}</Text>
      <Text style={sl.body}>This helps personalize your experience.</Text>

      <View style={sl.formWrap}>
        {/* Full name */}
        <View style={sl.fieldWrap}>
          <Text style={[sl.fieldLbl, { color: color.primary }]}>Full name *</Text>
          <View style={[sl.inputRow, { borderColor: name ? color.primary : "#E0D0D8" }]}>
            <Ionicons name="person-outline" size={16} color={color.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={sl.input}
              placeholder="e.g. Maria Santos"
              placeholderTextColor="#C0A8B4"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
          {!name.trim() && (
            <Text style={sl.required}>Required to continue</Text>
          )}
        </View>

        {/* School */}
        <View style={sl.fieldWrap}>
          <Text style={[sl.fieldLbl, { color: color.primary }]}>School / university</Text>
          <View style={[sl.inputRow, { borderColor: school ? color.primary : "#E0D0D8" }]}>
            <Ionicons name="school-outline" size={16} color={color.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={sl.input}
              placeholder="e.g. University of Santo Tomas"
              placeholderTextColor="#C0A8B4"
              value={school}
              onChangeText={setSchool}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Course */}
        <View style={sl.fieldWrap}>
          <Text style={[sl.fieldLbl, { color: color.primary }]}>Course</Text>
          <View style={[sl.inputRow, { borderColor: course ? color.primary : "#E0D0D8" }]}>
            <Ionicons name="book-outline" size={16} color={color.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={sl.input}
              placeholder="e.g. BS Nursing"
              placeholderTextColor="#C0A8B4"
              value={course}
              onChangeText={setCourse}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Section */}
        <View style={sl.fieldWrap}>
          <Text style={[sl.fieldLbl, { color: color.primary }]}>Section</Text>
          <View style={[sl.inputRow, { borderColor: section ? color.primary : "#E0D0D8" }]}>
            <Ionicons name="people-outline" size={16} color={color.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={sl.input}
              placeholder="e.g. Section A"
              placeholderTextColor="#C0A8B4"
              value={section}
              onChangeText={setSection}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Year level */}
        <View style={sl.fieldWrap}>
          <Text style={[sl.fieldLbl, { color: color.primary }]}>Year level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
              {YEAR_LEVELS.map((y: string) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => setYear(y)}
                  style={[
                    sl.yearChip,
                    {
                      backgroundColor: year === y ? color.primary : color.light,
                      borderColor:     year === y ? color.primary : "#E0D0D8",
                    },
                  ]}
                >
                  <Text
                    style={[
                      sl.yearChipTxt,
                      { color: year === y ? "#fff" : color.dark },
                    ]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Appearance
// ─────────────────────────────────────────────────────────────────────────────
function AppearanceSlide({
  color, scheme, setScheme, mode, setMode, SCHEMES, MODES,
}: any) {
  return (
    <View style={sl.wrap}>
      <View style={[sl.iconCircleSmall, { backgroundColor: color.light }]}>
        <Ionicons name="color-palette-outline" size={32} color={color.primary} />
      </View>

      <View style={[sl.tagPill, { backgroundColor: color.light }]}>
        <Text style={[sl.tag, { color: color.primary }]}>Appearance</Text>
      </View>

      <Text style={sl.title}>{"Make it\nyours"}</Text>
      <Text style={sl.body}>
        Pick your color theme and display mode. You can always change this later in your profile.
      </Text>

      {/* Color themes */}
      <Text style={[sl.sectionLbl, { color: color.dark }]}>Color theme</Text>
      <View style={sl.schemeGrid}>
        {SCHEMES.map((sc: any) => {
          const active = scheme === sc.key;
          return (
            <TouchableOpacity
              key={sc.key}
              onPress={() => setScheme(sc.key)}
              style={[
                sl.schemeCard,
                {
                  backgroundColor: sc.light,
                  borderColor:     active ? sc.primary : sc.primary + "30",
                  borderWidth:     active ? 2 : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={[sl.schemeDot, { backgroundColor: sc.primary }]} />
              <Text style={[sl.schemeLabel, { color: sc.dark }]}>{sc.label}</Text>
              {active && (
                <View style={[sl.schemeCheck, { backgroundColor: sc.primary }]}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Display mode */}
      <Text style={[sl.sectionLbl, { color: color.dark, marginTop: 20 }]}>Display mode</Text>
      <View style={sl.modeRow}>
        {MODES.map((m: any) => {
          const active = mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[
                sl.modeCard,
                {
                  backgroundColor: active
                    ? m.key === "dark" ? "#1A1218" : "#fff"
                    : m.key === "dark" ? "#2A1E24" : color.light,
                  borderColor: active ? color.primary : color.primary + "30",
                  borderWidth: active ? 2 : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={m.icon as any}
                size={28}
                color={
                  active
                    ? color.primary
                    : m.key === "dark" ? "#888" : "#C0A8B4"
                }
              />
              <Text
                style={[
                  sl.modeTxt,
                  {
                    color: active
                      ? color.primary
                      : m.key === "dark" ? "#888" : "#B09098",
                    fontWeight: active ? "600" : "400",
                  },
                ]}
              >
                {m.label}
              </Text>
              {active && (
                <View style={[sl.modeCheck, { backgroundColor: color.primary }]}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Live preview strip */}
      <View
        style={[
          sl.previewStrip,
          {
            backgroundColor: mode === "dark" ? "#1A1218" : "#fff",
            borderColor:     color.primary + "30",
          },
        ]}
      >
        <View style={[sl.previewDot, { backgroundColor: color.primary }]} />
        <Text style={[sl.previewTxt, { color: mode === "dark" ? "#F4C0D1" : color.dark }]}>
          Preview — {color.label} · {mode === "dark" ? "Dark" : "Light"} mode
        </Text>
        <Ionicons
          name={mode === "dark" ? "moon" : "sunny"}
          size={16}
          color={color.primary}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Ready
// ─────────────────────────────────────────────────────────────────────────────
function ReadySlide({
  color, name,
}: {
  color: typeof SCHEMES[number];
  name: string;
}) {
  return (
    <View style={[sl.wrap, { alignItems: "center", justifyContent: "center", minHeight: 520 }]}>
      <View style={[sl.iconRing2, { borderColor: color.primary + "18" }]} />
      <View style={[sl.iconRing1, { borderColor: color.primary + "28" }]} />
      <View style={[sl.iconCircle, { backgroundColor: color.light }]}>
        <Image source={BOT_ICON} style={sl.appIcon} />
      </View>

      <View style={[sl.tagPill, { backgroundColor: color.light, marginTop: 28 }]}>
        <Ionicons name="checkmark-circle" size={14} color={color.primary} />
        <Text style={[sl.tag, { color: color.primary, marginLeft: 4 }]}>All set!</Text>
      </View>

      <Text style={[sl.title, { textAlign: "center" }]}>
        {name.trim()
          ? `Welcome,\n${name.split(" ")[0]}! 👋`
          : "You're all set! 👋"}
      </Text>

      <Text style={[sl.body, { textAlign: "center" }]}>
        Your profile and preferences are saved. Start adding your schedules and let NurseSched keep you on track.
      </Text>

      {/* Quick tips */}
      <View style={[sl.card, { borderColor: color.primary + "25", backgroundColor: color.light + "88", marginTop: 8 }]}>
        {[
          { icon: "add-circle-outline",      text: "Tap + on Home to add a schedule"        },
          { icon: "warning-outline",         text: "Mark urgent to get priority reminders"  },
          { icon: "calendar-outline",        text: "Check Calendar for your monthly view"   },
          { icon: "color-palette-outline",   text: "Change theme anytime in Profile"        },
        ].map((tip, i) => (
          <View
            key={i}
            style={[
              sl.featRow,
              i > 0 && { borderTopWidth: 0.5, borderTopColor: color.primary + "18" },
            ]}
          >
            <View style={[sl.featIcon, { backgroundColor: color.light }]}>
              <Ionicons name={tip.icon as any} size={17} color={color.primary} />
            </View>
            <Text style={sl.featTxt}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1 },
  skipBtn:  { position: "absolute", top: Platform.OS === "ios" ? 56 : 36, right: 20, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 20 },
  skipTxt:  { fontSize: 13, fontWeight: "500" },
  slideScroll: { paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 64 : 48, paddingBottom: 16 },
  bottom:   { paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 44 : 28, paddingTop: 14, gap: 12, alignItems: "center", borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.06)" },
  dotsRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  dot:      { height: 8, borderRadius: 4 },
  nextBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", paddingVertical: 15, borderRadius: 14 },
  nextTxt:  { fontSize: 16, fontWeight: "600", color: "#fff" },
  counter:  { fontSize: 12 },
});

const sl = StyleSheet.create({
  wrap:          { width: width - 48, alignItems: "flex-start" },
  iconCircle:    { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", zIndex: 2, marginBottom: 24, alignSelf: "center" },
  iconCircleSmall: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center" },
  iconRing1:     { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, alignSelf: "center" },
  iconRing2:     { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 1, alignSelf: "center" },
  appIcon:       { width: 72, height: 72, borderRadius: 18 },
  tagPill:       { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  tag:           { fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
  title:         { fontSize: 34, fontWeight: "700", color: "#1A0D14", lineHeight: 42, marginBottom: 12, letterSpacing: -0.5 },
  body:          { fontSize: 15, color: "#7A5A65", lineHeight: 24, marginBottom: 20 },
  card:          { width: "100%", borderWidth: 1, borderRadius: 16, overflow: "hidden", marginBottom: 8 },
  featRow:       { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  featIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featTxt:       { fontSize: 13, fontWeight: "500", color: "#3A2A30", flex: 1 },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  gridCard:      { width: "47%", borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  gridIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gridTitle:     { fontSize: 13, fontWeight: "600" },
  gridDesc:      { fontSize: 12, color: "#7A5A65", lineHeight: 17 },
  formWrap:      { width: "100%", gap: 14 },
  fieldWrap:     { gap: 5 },
  fieldLbl:      { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  inputRow:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input:         { flex: 1, fontSize: 14, color: "#1A0D14" },
  required:      { fontSize: 11, color: "#E24B4A", marginTop: 2 },
  yearChip:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  yearChipTxt:   { fontSize: 13, fontWeight: "500" },
  sectionLbl:    { fontSize: 12, fontWeight: "600", letterSpacing: 0.3, marginBottom: 10, textTransform: "uppercase" },
  schemeGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  schemeCard:    { width: "28%", flexGrow: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 6, position: "relative" },
  schemeDot:     { width: 28, height: 28, borderRadius: 14 },
  schemeLabel:   { fontSize: 12, fontWeight: "600" },
  schemeCheck:   { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  modeRow:       { flexDirection: "row", gap: 12, width: "100%" },
  modeCard:      { flex: 1, borderRadius: 14, padding: 18, alignItems: "center", gap: 8, position: "relative" },
  modeTxt:       { fontSize: 14 },
  modeCheck:     { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  previewStrip:  { flexDirection: "row", alignItems: "center", gap: 8, width: "100%", borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 },
  previewDot:    { width: 10, height: 10, borderRadius: 5 },
  previewTxt:    { flex: 1, fontSize: 13, fontWeight: "500" },
});