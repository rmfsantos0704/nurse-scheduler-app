import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, Platform, TextInput,
  ScrollView, KeyboardAvoidingView, StatusBar,
} from "react-native";
import { useState, useRef } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { courseService } from "../services/courseService";
import { initDb } from "../database/db";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const APP_ICON = require("../assets/images/icon.png");

const SCHEMES = [
  { key: "pink",   label: "Rose",   primary: "#D4537E", light: "#FFE4EC", dark: "#72243E" },
  { key: "blue",   label: "Ocean",  primary: "#378ADD", light: "#E6F1FB", dark: "#0C447C" },
  { key: "purple", label: "Violet", primary: "#7F77DD", light: "#EEEDFE", dark: "#3C3489" },
  { key: "teal",   label: "Teal",   primary: "#1D9E75", light: "#E1F5EE", dark: "#085041" },
  { key: "green",  label: "Forest", primary: "#639922", light: "#EAF3DE", dark: "#27500A" },
] as const;

const COURSE_COLORS = ["#378ADD","#D4537E","#7F77DD","#1D9E75","#639922","#BA7517","#E24B4A","#0F6E56"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

type SchemeKey = typeof SCHEMES[number]["key"];
type ModeKey = "light" | "dark";
type SlideId = "welcome" | "features" | "appearance" | "courses" | "ready";
const SLIDES: SlideId[] = ["welcome", "features", "appearance", "courses", "ready"];

type OnboardingCourse = {
  name: string; code: string; instructor: string;
  room: string; color: string;
  timeslots: { day: string; startTime: string; endTime: string }[];
};

const PAGE_BG   = { light: "#FFFFFF", dark: "#0F0F0F" };
const PAGE_TEXT = { light: "#1A1A1A", dark: "#F0F0F0" };
const PAGE_SUB  = { light: "#666666", dark: "#AAAAAA" };
const PAGE_CARD = { light: "#F7F7F7", dark: "#1E1E1E" };
const PAGE_BORD = { light: "#E8E8E8", dark: "#2E2E2E" };

export default function Onboarding() {
  const flatRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const [scheme, setScheme] = useState<SchemeKey>("blue");
  const [mode,   setMode]   = useState<ModeKey>("light");

  const [onboardingCourses, setOnboardingCourses] = useState<OnboardingCourse[]>([]);

  // ✅ FIX 1: Pull setScheme/setMode from ThemeContext so changes apply
  // to the whole app immediately — not just the onboarding preview.
  const { setScheme: applyScheme, setMode: applyMode } = useTheme();

  const accent = SCHEMES.find(s => s.key === scheme)!;

  const pg = {
    bg:   PAGE_BG[mode],
    text: PAGE_TEXT[mode],
    sub:  PAGE_SUB[mode],
    card: PAGE_CARD[mode],
    bord: PAGE_BORD[mode],
  };

  const isLast = index === SLIDES.length - 1;

  // ✅ FIX 2: Derive button label from a stable value — lock it to the
  // slide index rather than SLIDES.length arithmetic, which was causing
  // the label to flicker when sub-steps inside a slide re-rendered.
  const nextLabel = isLast
    ? "Enter SnowEd"
    : index === SLIDES.length - 2
      ? "Almost done"
      : "Next";

  const goTo = (i: number) => {
    flatRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const handleNext = () => {
    if (isLast) finish();
    else goTo(index + 1);
  };

  const finish = async () => {
    const profile = { name: "", school: "", course: "", year: "", section: "", avatar: null };

    // ✅ FIX 1 (continued): Apply theme to context BEFORE navigating so
    // the home screen renders with the correct theme instantly.
    applyScheme(scheme);
    applyMode(mode);

    await AsyncStorage.multiSet([
      ["onboardingDone", "true"],
      ["profileData",    JSON.stringify(profile)],
      ["themeScheme",    scheme],
      ["themeMode",      mode],
    ]);
    for (const c of onboardingCourses) {
      await courseService.create(c).catch(() => {});
    }
    router.replace("/(tabs)/home");
  };

  // ✅ FIX 3: Sync local onboarding preview AND context together so the
  // live preview on the appearance slide matches what the app will look like.
  const handleSetScheme = (s: SchemeKey) => {
    setScheme(s);
    applyScheme(s);
  };

  const handleSetMode = (m: ModeKey) => {
    setMode(m);
    applyMode(m);
  };

  const onScroll = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i >= 0 && i < SLIDES.length) setIndex(i);
  };

  const sharedProps = { accent, pg, mode, scheme };

  const renderSlide = (id: SlideId) => {
    switch (id) {
      case "welcome":    return <WelcomeSlide    {...sharedProps} />;
      case "features":   return <FeaturesSlide   {...sharedProps} />;
      case "appearance":
        return (
          <AppearanceSlide
            {...sharedProps}
            setScheme={handleSetScheme}
            setMode={handleSetMode}
            SCHEMES={SCHEMES}
          />
        );
      case "courses":    return <CourseSetupSlide {...sharedProps} courses={onboardingCourses} setCourses={setOnboardingCourses} />;
      case "ready":      return <ReadySlide       {...sharedProps} name={""} />;
    }
  };

  return (
    <View style={[s.root, { backgroundColor: pg.bg }]}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={pg.bg}
      />

      {!isLast && index < 2 && (
        <TouchableOpacity
          style={[s.skipBtn, { backgroundColor: pg.card, borderColor: pg.bord }]}
          onPress={finish}
        >
          <Text style={[s.skipTxt, { color: pg.sub }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={(id) => id}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          extraData={[scheme, mode, index]}

          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}

          initialNumToRender={SLIDES.length}

          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatRef.current?.scrollToIndex({ index: info.index, animated: true });
            }, 100);
          }}

          renderItem={({ item }) => (
            <View style={{ width }}>
              <ScrollView
                contentContainerStyle={s.slideScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderSlide(item)}
              </ScrollView>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      {/* Bottom nav */}
      <View style={[s.bottom, { backgroundColor: pg.bg, borderTopColor: pg.bord }]}>
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, {
              backgroundColor: i === index ? accent.primary : pg.bord,
              width: i === index ? 22 : 8,
            }]} />
          ))}
        </View>

        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: accent.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {/* ✅ FIX 2: Use pre-computed stable label — no more flickering */}
          <Text style={[s.nextTxt, { color: "#fff" }]}>{nextLabel}</Text>
          <Ionicons
            name={isLast ? "arrow-forward-circle" : "arrow-forward"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={[s.counter, { color: pg.sub }]}>{index + 1} of {SLIDES.length}</Text>
      </View>
    </View>
  );
}

// ─── Shared prop types ────────────────────────────────────────────────────────
type SP = {
  accent: typeof SCHEMES[number];
  pg: { bg: string; text: string; sub: string; card: string; bord: string };
  mode: ModeKey;
  scheme: SchemeKey;
};

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Welcome
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeSlide({ accent, pg }: SP) {
  return (
    <View style={sl.wrap}>
      <View style={sl.iconWrap}>
        <View style={[sl.iconRing2, { borderColor: accent.primary + "18" }]} />
        <View style={[sl.iconRing1, { borderColor: accent.primary + "28" }]} />
        <View style={[sl.iconCircle, { backgroundColor: accent.light }]}>
          <Image source={APP_ICON} style={sl.appIcon} />
        </View>
      </View>

      <View style={[sl.tagPill, { backgroundColor: accent.primary + "18" }]}>
        <Text style={[sl.tag, { color: accent.primary }]}>Welcome to SnowEd</Text>
      </View>

      <Text style={[sl.title, { color: pg.text }]}>{"Your school\nlife, organized"}</Text>
      <Text style={[sl.body, { color: pg.sub }]}>
        SnowEd helps students stay on top of classes, assignments, quizzes, and activities — with smart reminders so nothing gets missed.
      </Text>

      <View style={[sl.card, { borderColor: pg.bord, backgroundColor: pg.card }]}>
        {[
          { icon: "library-outline",       text: "Track every subject and course"            },
          { icon: "calendar-outline",      text: "Schedule classes, quizzes & activities"    },
          { icon: "notifications-outline", text: "Smart notifications before tasks start"    },
          { icon: "document-text-outline", text: "Take notes and keep ideas organized"       },
          { icon: "globe-outline",         text: "Research topics with Wikipedia"            },
        ].map((f, i) => (
          <View key={i} style={[sl.featRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: pg.bord }]}>
            <View style={[sl.featIcon, { backgroundColor: accent.primary + "18" }]}>
              <Ionicons name={f.icon as any} size={17} color={accent.primary} />
            </View>
            <Text style={[sl.featTxt, { color: pg.text }]}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Features
// ─────────────────────────────────────────────────────────────────────────────
function FeaturesSlide({ accent, pg }: SP) {
  const features = [
    { icon: "home-outline",          title: "Dashboard",  desc: "Today's schedule, progress, next event, and urgent alerts at a glance.", bg: "#E6F1FB", ic: "#378ADD" },
    { icon: "library-outline",       title: "Courses",    desc: "Add subjects with teachers, rooms, and class schedules. View all activity per course.", bg: "#EEEDFE", ic: "#7F77DD" },
    { icon: "calendar-outline",      title: "Calendar",   desc: "Monthly view of all schedules. Tap any date to see full task details.", bg: "#EAF3DE", ic: "#639922" },
    { icon: "document-text-outline", title: "Notes",      desc: "A full notepad for jotting down ideas, summaries, and reminders per subject.", bg: "#E1F5EE", ic: "#1D9E75" },
    { icon: "notifications-outline", title: "Reminders",  desc: "Urgent tasks surfaced automatically — sorted by overdue, today, and upcoming.", bg: "#FCEBEB", ic: "#E24B4A" },
    { icon: "globe-outline",         title: "Research",   desc: "Search Wikipedia for study topics, read articles, and save useful content to Notes.", bg: "#E6F1FB", ic: "#378ADD" },
    { icon: "color-palette-outline", title: "Themes",     desc: "5 color themes + light/dark mode. Saved across the whole app.", bg: "#FFE4EC", ic: "#D4537E" },
  ];

  return (
    <View style={sl.wrap}>
      <View style={[sl.tagPill, { backgroundColor: accent.primary + "18" }]}>
        <Text style={[sl.tag, { color: accent.primary }]}>Features</Text>
      </View>
      <Text style={[sl.title, { color: pg.text }]}>{"Everything\nyou need"}</Text>
      <Text style={[sl.body, { color: pg.sub }]}>Everything built around how students actually study and plan.</Text>

      <View style={sl.grid}>
        {features.map((f, i) => (
          <View key={i} style={[sl.gridCard, { backgroundColor: pg.card, borderColor: pg.bord }]}>
            <View style={[sl.gridIcon, { backgroundColor: f.bg + "88" }]}>
              <Ionicons name={f.icon as any} size={20} color={f.ic} />
            </View>
            <Text style={[sl.gridTitle, { color: f.ic }]}>{f.title}</Text>
            <Text style={[sl.gridDesc, { color: pg.sub }]}>{f.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Appearance
// ─────────────────────────────────────────────────────────────────────────────
function AppearanceSlide({ accent, pg, mode, scheme, setScheme, setMode, SCHEMES }: SP & any) {
  return (
    <View style={sl.wrap}>
      <View style={[sl.iconCircleSmall, { backgroundColor: accent.primary + "18" }]}>
        <Ionicons name="color-palette-outline" size={32} color={accent.primary} />
      </View>
      <View style={[sl.tagPill, { backgroundColor: accent.primary + "18" }]}>
        <Text style={[sl.tag, { color: accent.primary }]}>Appearance</Text>
      </View>
      <Text style={[sl.title, { color: pg.text }]}>{"Make it\nyours"}</Text>
      <Text style={[sl.body, { color: pg.sub }]}>
        Pick your color theme and display mode. The whole page updates live as you choose.
      </Text>

      <Text style={[csl.sectionLbl, { color: pg.sub }]}>Display mode</Text>
      <View style={{ flexDirection: "row", gap: 12, width: "100%", marginBottom: 22 }}>
        {(["light","dark"] as ModeKey[]).map(m => {
          const active = mode === m;
          const isDark = m === "dark";
          return (
            <TouchableOpacity key={m} onPress={() => setMode(m)}
              style={[asl.modeCard, {
                backgroundColor: isDark ? "#161616" : "#FAFAFA",
                borderColor: active ? accent.primary : pg.bord,
                borderWidth: active ? 2 : 1,
                flex: 1,
              }]}
              activeOpacity={0.8}
            >
              <View style={{ width: "100%", gap: 5, marginBottom: 10 }}>
                <View style={[asl.mockBar, { backgroundColor: isDark ? "#2A2A2A" : "#EEEEEE", width: "70%" }]} />
                <View style={[asl.mockBar, { backgroundColor: isDark ? "#222222" : "#E8E8E8", width: "50%", height: 5 }]} />
                <View style={[asl.mockCard, {
                  backgroundColor: isDark ? accent.primary + "33" : accent.primary + "22",
                  borderLeftColor: accent.primary, borderLeftWidth: 3,
                }]}>
                  <View style={[asl.mockBar, { backgroundColor: accent.primary, width: "60%", height: 5 }]} />
                </View>
              </View>
              <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={active ? accent.primary : pg.sub} />
              <Text style={[asl.modeLbl, { color: active ? accent.primary : pg.sub, fontWeight: active ? "700" : "400" }]}>
                {isDark ? "Dark" : "Light"}
              </Text>
              {active && (
                <View style={[asl.check, { backgroundColor: accent.primary }]}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[csl.sectionLbl, { color: pg.sub }]}>Color theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" }}>
        {SCHEMES.map((sc: any) => {
          const active = scheme === sc.key;
          return (
            <TouchableOpacity
              key={sc.key}
              onPress={() => setScheme(sc.key)}
              style={[{
                alignItems: "center",
                gap: 6,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: pg.card,
                borderColor: active ? sc.primary : pg.bord,
                borderWidth: active ? 2 : 1,
                flexDirection: "row",
              }]}
              activeOpacity={0.8}
            >
              <View style={{ width: 22, height: 22, position: "relative" }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: sc.primary }} />
                {active && (
                  <View style={{ position: "absolute", inset: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[{ fontSize: 13, fontWeight: "500" }, { color: active ? sc.primary : pg.sub }]}>
                {sc.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Courses
// ─────────────────────────────────────────────────────────────────────────────
function CourseSetupSlide({ accent, pg, courses, setCourses }: SP & {
  courses: OnboardingCourse[];
  setCourses: (c: OnboardingCourse[]) => void;
}) {
  const [step, setStep]               = useState<"list" | "add">("list");
  const [cName, setCName]             = useState("");
  const [cCode, setCCode]             = useState("");
  const [cInstructor, setCInstructor] = useState("");
  const [cRoom, setCRoom]             = useState("");
  const [cColor, setCColor]           = useState(COURSE_COLORS[0]);
  const [timeslots, setTimeslots]     = useState<{ day: string; startTime: string; endTime: string }[]>([]);
  const [editingIdx, setEditingIdx]   = useState<number | null>(null);

  const resetForm = () => { setCName(""); setCCode(""); setCInstructor(""); setCRoom(""); setCColor(COURSE_COLORS[0]); setTimeslots([]); setEditingIdx(null); };

  const openAdd  = () => { resetForm(); setStep("add"); };
  const openEdit = (i: number) => {
    const c = courses[i];
    setCName(c.name); setCCode(c.code); setCInstructor(c.instructor);
    setCRoom(c.room); setCColor(c.color); setTimeslots([...c.timeslots]);
    setEditingIdx(i); setStep("add");
  };

  const save = () => {
    if (!cName.trim()) return;
    const entry: OnboardingCourse = { name: cName.trim(), code: cCode.trim(), instructor: cInstructor.trim(), room: cRoom.trim(), color: cColor, timeslots };
    if (editingIdx !== null) {
      const u = [...courses]; u[editingIdx] = entry; setCourses(u);
    } else {
      setCourses([...courses, entry]);
    }
    resetForm(); setStep("list");
  };

  const remove     = (i: number) => setCourses(courses.filter((_, idx) => idx !== i));
  const addSlot    = () => setTimeslots(ts => [...ts, { day: "Mon", startTime: "08:00 AM", endTime: "09:30 AM" }]);
  const updateSlot = (i: number, k: string, v: string) => setTimeslots(ts => ts.map((t, idx) => idx === i ? { ...t, [k]: v } : t));
  const removeSlot = (i: number) => setTimeslots(ts => ts.filter((_, idx) => idx !== i));

  if (step === "list") {
    return (
      <View style={sl.wrap}>
        <View style={[sl.iconCircleSmall, { backgroundColor: accent.primary + "18" }]}>
          <Ionicons name="library-outline" size={32} color={accent.primary} />
        </View>
        <View style={[sl.tagPill, { backgroundColor: accent.primary + "18" }]}>
          <Text style={[sl.tag, { color: accent.primary }]}>Your subjects</Text>
        </View>
        <Text style={[sl.title, { color: pg.text }]}>{"Add your\nsubjects"}</Text>
        <Text style={[sl.body, { color: pg.sub }]}>Add your enrolled subjects — teachers, rooms, and schedules included. You can always add more later.</Text>

        {courses.length > 0 ? (
          <View style={{ width: "100%", gap: 10, marginBottom: 14 }}>
            {courses.map((c, i) => (
              <View key={i} style={[csl.card, { backgroundColor: pg.card, borderColor: pg.bord, borderTopColor: c.color, borderTopWidth: 3 }]}>
                <View style={csl.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[csl.cardName, { color: pg.text }]}>{c.name}</Text>
                    {c.code ? <Text style={[csl.cardMeta, { color: pg.sub }]}>{c.code}</Text> : null}
                    {c.instructor ? (
                      <View style={csl.metaRow}>
                        <Ionicons name="person-outline" size={12} color={pg.sub} />
                        <Text style={[csl.cardMeta, { color: pg.sub }]}>{c.instructor}</Text>
                      </View>
                    ) : null}
                    {c.room ? (
                      <View style={csl.metaRow}>
                        <Ionicons name="location-outline" size={12} color={pg.sub} />
                        <Text style={[csl.cardMeta, { color: pg.sub }]}>{c.room}</Text>
                      </View>
                    ) : null}
                    {c.timeslots.length > 0 && (
                      <View style={csl.slotRow}>
                        {c.timeslots.map((ts, ti) => (
                          <View key={ti} style={[csl.slotTag, { backgroundColor: c.color + "22" }]}>
                            <Text style={[csl.slotTxt, { color: c.color }]}>{ts.day} {ts.startTime}–{ts.endTime}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={csl.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(i)} style={csl.iconBtn}>
                      <Ionicons name="pencil-outline" size={16} color={pg.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(i)} style={csl.iconBtn}>
                      <Ionicons name="close-circle-outline" size={16} color="#E24B4A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[csl.emptyBox, { borderColor: pg.bord, backgroundColor: pg.card }]}>
            <Ionicons name="library-outline" size={36} color={accent.primary + "66"} />
            <Text style={[csl.emptyTxt, { color: pg.sub }]}>No subjects yet</Text>
          </View>
        )}

        <TouchableOpacity onPress={openAdd} style={[csl.addBtn, { backgroundColor: accent.primary }]}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={csl.addBtnTxt}>Add a subject</Text>
        </TouchableOpacity>
        <Text style={[{ fontSize: 12, color: pg.sub, textAlign: "center", marginTop: 12 }]}>
          Subjects are optional — tap Next to continue
        </Text>
      </View>
    );
  }

  return (
    <View style={sl.wrap}>
      <TouchableOpacity onPress={() => { resetForm(); setStep("list"); }}
        style={[csl.backBtn, { backgroundColor: pg.card, borderColor: pg.bord }]}>
        <Ionicons name="arrow-back" size={16} color={accent.primary} />
        <Text style={[csl.backTxt, { color: accent.primary }]}>Back</Text>
      </TouchableOpacity>

      <View style={[sl.tagPill, { backgroundColor: accent.primary + "18", marginTop: 12 }]}>
        <Text style={[sl.tag, { color: accent.primary }]}>{editingIdx !== null ? "Edit subject" : "New subject"}</Text>
      </View>
      <Text style={[sl.title, { color: pg.text, fontSize: 26, marginBottom: 8 }]}>Subject details</Text>

      <Text style={[csl.sectionLbl, { color: pg.sub }]}>Basic info</Text>
      {[
        { lbl: "Subject name *", val: cName, set: setCName, icon: "library-outline",  ph: "e.g. Mathematics, Biology" },
        { lbl: "Subject code",   val: cCode, set: setCCode, icon: "code-outline",     ph: "e.g. MATH 101, BIO 201"    },
      ].map(f => (
        <View key={f.lbl} style={{ marginBottom: 12, width: "100%"}}>
          <Text style={[sl.fieldLbl, { color: accent.primary }]}>{f.lbl}</Text>
          <View style={[sl.inputRow, {
            borderColor: cName ? accent.primary : pg.bord,
            backgroundColor: pg.card,
            paddingVertical: 16,
            paddingHorizontal: 16,
          }]}>
            <Ionicons name="library-outline" size={16} color={accent.primary} style={{ marginRight: 10 }} />
            <TextInput style={[sl.input, { color: pg.text, fontSize: 15 }]} placeholder={f.ph}
              placeholderTextColor={pg.sub} value={f.val} onChangeText={f.set} autoCapitalize="words" />
          </View>
        </View>
      ))}
      <View style={{ height: 8 }} />
      <Text style={[csl.sectionLbl, { color: pg.sub }]}>Teacher & location</Text>
      {[
        { lbl: "Teacher / professor", val: cInstructor, set: setCInstructor, icon: "person-outline",   ph: "e.g. Mr. Cruz, Ms. Santos" },
        { lbl: "Room / location",     val: cRoom,       set: setCRoom,       icon: "location-outline", ph: "e.g. Room 204, Science Lab" },
      ].map(f => (
        <View key={f.lbl} style={{ marginBottom: 12, width: "100%" }}>
          <Text style={[sl.fieldLbl, { color: accent.primary }]}>{f.lbl}</Text>
          <View style={[sl.inputRow, { borderColor: f.val ? accent.primary : pg.bord, backgroundColor: pg.card }]}>
            <Ionicons name={f.icon as any} size={15} color={accent.primary} style={{ marginRight: 8 }} />
            <TextInput style={[sl.input, { color: pg.text }]} placeholder={f.ph}
              placeholderTextColor={pg.sub} value={f.val} onChangeText={f.set} autoCapitalize="words" />
          </View>
        </View>
      ))}

      <Text style={[csl.sectionLbl, { color: pg.sub }]}>Subject color</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {COURSE_COLORS.map(c => (
          <TouchableOpacity key={c} onPress={() => setCColor(c)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c,
              borderWidth: cColor === c ? 3 : 0, borderColor: "#fff",
              alignItems: "center", justifyContent: "center", elevation: cColor === c ? 4 : 0 }}>
            {cColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={csl.scheduleHeader}>
        <View>
          <Text style={[csl.sectionLbl, { color: pg.sub, marginBottom: 2 }]}>Class schedule</Text>
          <Text style={[{ fontSize: 11, color: pg.sub }]}>Days and times this class meets</Text>
        </View>
        <TouchableOpacity onPress={addSlot} style={[csl.addSlotBtn, { backgroundColor: cColor + "22", borderColor: cColor + "50" }]}>
          <Ionicons name="add" size={16} color={cColor} />
          <Text style={[csl.addSlotTxt, { color: cColor }]}>Add slot</Text>
        </TouchableOpacity>
      </View>

      {timeslots.length === 0 ? (
        <View style={[csl.noSlotsBox, { borderColor: pg.bord, backgroundColor: pg.card }]}>
          <Ionicons name="time-outline" size={22} color={pg.sub} />
          <Text style={[{ fontSize: 12, color: pg.sub, textAlign: "center", marginTop: 4 }]}>
            No schedule added yet.{"\n"}Tap "Add slot" to set meeting days and times.
          </Text>
        </View>
      ) : (
        timeslots.map((ts, idx) => (
          <View key={idx} style={[csl.slotCard, { borderColor: cColor + "40", backgroundColor: pg.card }]}>
            <Text style={[csl.slotFieldLbl, { color: accent.primary }]}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {DAYS.map(d => (
                  <TouchableOpacity key={d} onPress={() => updateSlot(idx, "day", d)}
                    style={[csl.dayChip, { backgroundColor: ts.day === d ? cColor : pg.bg, borderColor: ts.day === d ? cColor : pg.bord }]}>
                    <Text style={[csl.dayChipTxt, { color: ts.day === d ? "#fff" : pg.sub }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[csl.slotFieldLbl, { color: accent.primary }]}>Time</Text>
            <View style={csl.timeRow}>
              {["startTime", "endTime"].map((k, ti) => (
                <View key={k} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={[csl.timeField, { borderColor: pg.bord, backgroundColor: pg.bg, flex: 1 }]}>
                    <Ionicons name="time-outline" size={13} color={pg.sub} />
                    <TextInput
                      style={[csl.timeInput, { color: pg.text }]}
                      placeholder={ti === 0 ? "08:00 AM" : "09:30 AM"}
                      placeholderTextColor={pg.sub}
                      value={ts[k as keyof typeof ts]}
                      onChangeText={(v) => updateSlot(idx, k, v)}
                    />
                  </View>
                  {ti === 0 && (
                    <Text style={[csl.timeSep, { color: pg.sub }]}>→</Text>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={() => removeSlot(idx)} style={csl.removeSlotBtn}>
                <Ionicons name="trash-outline" size={16} color="#E24B4A" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity onPress={save} disabled={!cName.trim()}
        style={[csl.saveBtn, { backgroundColor: cName.trim() ? cColor : pg.bord, marginTop: 16 }]}>
        <Ionicons name={editingIdx !== null ? "checkmark-circle-outline" : "add-circle-outline"} size={18} color="#fff" />
        <Text style={csl.saveBtnTxt}>{editingIdx !== null ? "Update subject" : "Add this subject"}</Text>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Ready
// ─────────────────────────────────────────────────────────────────────────────
function ReadySlide({ accent, pg, name }: SP & { name: string }) {
  return (
    <View style={[sl.wrap, { alignItems: "center", justifyContent: "center", minHeight: 520 }]}>
      <View style={sl.iconWrap}>
        <View style={[sl.iconRing2, { borderColor: accent.primary + "18" }]} />
        <View style={[sl.iconRing1, { borderColor: accent.primary + "28" }]} />
        <View style={[sl.iconCircle, { backgroundColor: accent.light }]}>
          <Image source={APP_ICON} style={sl.appIcon} />
        </View>
      </View>

      <View style={[sl.tagPill, { backgroundColor: accent.primary + "18", marginTop: 28 }]}>
        <Ionicons name="checkmark-circle" size={14} color={accent.primary} />
        <Text style={[sl.tag, { color: accent.primary, marginLeft: 4 }]}>All set!</Text>
      </View>

      <Text style={[sl.title, { color: pg.text, textAlign: "center" }]}>
        {name.trim() ? `Welcome,\n${name.split(" ")[0]}! 👋` : "You're all set! 👋"}
      </Text>
      <Text style={[sl.body, { color: pg.sub, textAlign: "center" }]}>
        Your subjects and preferences are saved. Start organizing your school life with SnowEd.
      </Text>

      <View style={[sl.card, { borderColor: pg.bord, backgroundColor: pg.card }]}>
        {[
          { icon: "library-outline",       text: "Check your subjects in the Courses tab"  },
          { icon: "add-circle-outline",    text: "Tap + on Home to add a schedule"         },
          { icon: "document-text-outline", text: "Open Notes to start your first note"     },
          { icon: "color-palette-outline", text: "Change your theme anytime in Profile"    },
        ].map((tip, i) => (
          <View key={i} style={[sl.featRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: pg.bord }]}>
            <View style={[sl.featIcon, { backgroundColor: accent.primary + "18" }]}>
              <Ionicons name={tip.icon as any} size={17} color={accent.primary} />
            </View>
            <Text style={[sl.featTxt, { color: pg.text }]}>{tip.text}</Text>
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
  root:        { flex: 1 },
  skipBtn:     { position: "absolute", top: Platform.OS === "ios" ? 56 : 36, right: 20, zIndex: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5 },
  skipTxt:     { fontSize: 13, fontWeight: "500" },
  slideScroll: { paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 64 : 48, paddingBottom: 16 },
  bottom:      { paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 44 : 28, paddingTop: 14, gap: 12, alignItems: "center", borderTopWidth: 0.5 },
  dotsRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  dot:         { height: 8, borderRadius: 4 },
  nextBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", paddingVertical: 15, borderRadius: 14 },
  nextTxt:     { fontSize: 16, fontWeight: "600" },
  counter:     { fontSize: 12 },
});

const sl = StyleSheet.create({
  wrap:            { width: width - 48, alignItems: "flex-start" },
  iconWrap:        { alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  iconCircle:      { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", zIndex: 2 },
  iconCircleSmall: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center" },
  iconRing1:       { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1.5 },
  iconRing2:       { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 1 },
  appIcon:         { width: 72, height: 72, borderRadius: 18 },
  tagPill:         { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  tag:             { fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
  title:           { fontSize: 34, fontWeight: "700", lineHeight: 42, marginBottom: 12, letterSpacing: -0.5 },
  body:            { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  card:            { width: "100%", borderWidth: 1, borderRadius: 16, overflow: "hidden", marginBottom: 8 },
  featRow:         { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  featIcon:        { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featTxt:         { fontSize: 13, fontWeight: "500", flex: 1 },
  grid:            { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  gridCard:        { width: "47%", borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  gridIcon:        { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gridTitle:       { fontSize: 13, fontWeight: "600" },
  gridDesc:        { fontSize: 11, lineHeight: 16 },
  formWrap:        { width: "100%", gap: 14 },
  fieldWrap:       { gap: 5 },
  fieldLbl:        { fontSize: 12, fontWeight: "600", letterSpacing: 0.3, marginBottom: 5 },
  inputRow:        { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 18, minHeight: 56, marginBottom: 14 },
  input:           { flex: 1, fontSize: 16, lineHeight: 22 },
  sectionLbl:      { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" },
});

const csl = StyleSheet.create({
  card:           { borderWidth: 1, borderRadius: 14, padding: 14, width: "100%" },
  cardTop:        { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardName:       { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  cardMeta:       { fontSize: 12 },
  metaRow:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  slotRow:        { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  slotTag:        { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  slotTxt:        { fontSize: 10, fontWeight: "500" },
  cardActions:    { flexDirection: "row", gap: 4 },
  iconBtn:        { padding: 6 },
  emptyBox:       { width: "100%", alignItems: "center", paddingVertical: 32, gap: 8, marginBottom: 8, borderWidth: 1, borderRadius: 14, borderStyle: "dashed" },
  emptyTxt:       { fontSize: 13, fontWeight: "500" },
  addBtn:         { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  addBtnTxt:      { color: "#fff", fontSize: 15, fontWeight: "600" },
  backBtn:        { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start", borderWidth: 0.5 },
  backTxt:        { fontSize: 13, fontWeight: "500" },
  sectionLbl:     { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  scheduleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  addSlotBtn:     { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addSlotTxt:     { fontSize: 12, fontWeight: "600" },
  noSlotsBox:     { width: "100%", alignItems: "center", paddingVertical: 20, borderWidth: 1, borderRadius: 12, marginBottom: 12, gap: 4 },
  slotCard:       { width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  slotFieldLbl:   { fontSize: 11, fontWeight: "600", letterSpacing: 0.3, marginBottom: 6 },
  dayChip:        { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  dayChipTxt:     { fontSize: 12, fontWeight: "500" },
  timeRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  timeField:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  timeInput:      { flex: 1, fontSize: 13 },
  timeSep:        { fontSize: 16 },
  removeSlotBtn:  { padding: 4 },
  saveBtn:        { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  saveBtnTxt:     { color: "#fff", fontSize: 15, fontWeight: "600" },
});

const asl = StyleSheet.create({
  modeCard:    { borderRadius: 16, padding: 16, alignItems: "center", gap: 6, position: "relative" },
  mockBar:     { height: 8, borderRadius: 4 },
  mockCard:    { borderRadius: 8, padding: 10, marginTop: 2 },
  mockPill:    { height: 20, borderRadius: 10 },
  modeLbl:     { fontSize: 14 },
  check:       { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  schemeCard:  { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, position: "relative" },
  schemeDot:   { width: 20, height: 20, borderRadius: 10 },
  schemeLabel: { fontSize: 13, fontWeight: "500" },
  previewBar:  { flexDirection: "row", alignItems: "center", gap: 8, width: "100%", borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  previewDot:  { width: 10, height: 10, borderRadius: 5 },
  previewTxt:  { flex: 1, fontSize: 13, fontWeight: "500" },
});