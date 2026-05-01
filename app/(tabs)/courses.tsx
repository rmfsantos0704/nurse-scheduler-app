import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";
import { SafeScreen } from "../../components/SafeScreen";
import { courseService } from "../../services/courseService";
import { scheduleService } from "../../services/scheduleService";

type Timeslot = { day: string; startTime: string; endTime: string };

type Course = {
  _id: string;
  name: string;
  code: string;
  instructor: string;
  room: string;
  color: string;
  timeslots: Timeslot[];
};

type ScheduleItem = {
  _id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  isUrgent?: boolean;
  courseId?: string;
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const COURSE_COLORS = [
  "#378ADD","#D4537E","#7F77DD","#1D9E75",
  "#639922","#BA7517","#E24B4A","#0F6E56",
];

const TYPE_COLORS: Record<string, string> = {
  Quiz:"#BA7517", Activity:"rgb(31, 160, 160)", Review:"#7F77DD",
  Class:"#c5cf08", Duty:"#D4537E", Study:"#378ADD", Exam:"#E24B4A", General:"#21a702",
};
const TYPE_BG: Record<string, string> = {
  Quiz:"#FAEEDA", Activity:"#EAF3DE", Review:"#EEEDFE",
  Class:"#E6F1FB", Duty:"#FBEAF0", Study:"#E6F1FB", Exam:"#FCEBEB", General:"#E6F1FB",
};

const EMPTY_COURSE = {
  name:"", code:"", instructor:"", room:"",
  color: COURSE_COLORS[0], timeslots:[] as Timeslot[],
};

export default function Courses() {
  const { colors } = useTheme();
  const [courses,         setCourses]         = useState<Course[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  // addModal removed — Add course now navigates to /add-course page
  const [editModal,       setEditModal]       = useState(false);
  const [detailModal,     setDetailModal]     = useState(false);
  const [selectedCourse,  setSelectedCourse]  = useState<Course | null>(null);
  const [courseSchedules, setCourseSchedules] = useState<ScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [form,            setForm]            = useState(EMPTY_COURSE);
  const [detailItem,      setDetailItem]      = useState<ScheduleItem | null>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);

  const openDetail = (item: ScheduleItem) => { setDetailItem(item); setDetailVisible(true); };

  useFocusEffect(useCallback(() => { fetchCourses(); }, []));

  // ── OFFLINE: read all courses from SQLite ─────────────────────────────
  const fetchCourses = async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data as Course[]);
    } catch (e) {
      console.warn("fetchCourses error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── OFFLINE: load course + its linked schedules from SQLite ───────────
  const fetchCourseDetail = async (course: Course) => {
    setSelectedCourse(course);
    setScheduleLoading(true);
    setDetailModal(true);
    try {
      const result = await courseService.getWithSchedules(course._id);
      setCourseSchedules((result.schedules ?? []) as ScheduleItem[]);
    } catch {
      setCourseSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // ── OFFLINE: update existing course in SQLite ─────────────────────────
  const handleUpdate = async () => {
    if (!selectedCourse || !form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await courseService.update(selectedCourse._id, form) as Course;
      setCourses(prev => prev.map(c => c._id === updated._id ? updated : c));
      setSelectedCourse(updated);
      setEditModal(false);
    } catch {
      Alert.alert("Error", "Could not update course.");
    } finally {
      setSaving(false);
    }
  };

  // ── OFFLINE: delete course from SQLite ────────────────────────────────
  const handleDelete = (course: Course) => {
    Alert.alert(
      "Delete course",
      `Remove "${course.name}"? Linked schedules will be unlinked but not deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            setCourses(prev => prev.filter(c => c._id !== course._id));
            setDetailModal(false);
            await courseService.remove(course._id).catch(() => {});
          },
        },
      ]
    );
  };

  // ── Timeslot helpers ──────────────────────────────────────────────────
  const addTimeslot = () => {
    setForm(f => ({ ...f, timeslots: [...f.timeslots, { day: "Monday", startTime: "08:00 AM", endTime: "09:00 AM" }] }));
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

  const done    = (s: ScheduleItem[]) => s.filter(i =>  i.isCompleted);
  const pending = (s: ScheduleItem[]) => s.filter(i => !i.isCompleted);

  const openEdit = (course: Course) => {
    setSelectedCourse(course);
    setForm({
      name: course.name, code: course.code,
      instructor: course.instructor, room: course.room,
      color: course.color, timeslots: course.timeslots,
    });
    setDetailModal(false);
    setTimeout(() => setEditModal(true), 300);
  };

  if (loading) return (
    <View style={[s.loader, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading courses...</Text>
    </View>
  );

  return (
    <>
      <SafeScreen edges={["top", "bottom"]}>
        <ScrollView
          style={[s.screen, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCourses(); }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={s.headerRow}>
            <View>
              <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Courses</Text>
              <Text style={[s.pageSub, { color: colors.textSecondary }]}>{courses.length} enrolled</Text>
            </View>
            {/* Navigates to /add-course page instead of opening a modal */}
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/add-course")}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {courses.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="library-outline" size={48} color={colors.primary} />
              <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No courses yet</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                Add your subjects to track activities and schedules per course.
              </Text>
            </View>
          ) : (
            <View style={s.grid}>
              {courses.map(course => (
                <TouchableOpacity
                  key={course._id}
                  style={[s.courseCard, {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderTopColor: course.color,
                    borderTopWidth: 4,
                  }]}
                  onPress={() => fetchCourseDetail(course)}
                  activeOpacity={0.8}
                >
                  <View style={s.courseCardTop}>
                    <View style={[s.courseColorDot, { backgroundColor: course.color }]} />
                    <Text style={[s.courseCode, { color: colors.textSecondary }]}>{course.code || "—"}</Text>
                  </View>
                  <Text style={[s.courseName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {course.name}
                  </Text>
                  {course.instructor ? (
                    <Text style={[s.courseInstructor, { color: colors.textSecondary }]} numberOfLines={1}>
                      {course.instructor}
                    </Text>
                  ) : null}
                  {course.timeslots.length > 0 && (
                    <View style={s.timeslotPreview}>
                      {course.timeslots.slice(0, 2).map((ts, i) => (
                        <View key={i} style={[s.timeslotTag, { backgroundColor: course.color + "22" }]}>
                          <Text style={[s.timeslotTagTxt, { color: course.color }]}>
                            {ts.day.slice(0, 3)} {ts.startTime}
                          </Text>
                        </View>
                      ))}
                      {course.timeslots.length > 2 && (
                        <Text style={[s.moreTs, { color: colors.textSecondary }]}>
                          +{course.timeslots.length - 2}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeScreen>

      {/* ── EDIT MODAL (kept as modal — less frequent action) ── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={[s.overlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View style={[s.sheet, { backgroundColor: colors.background }]}>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>Edit course</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Course name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. Mathematics" placeholderTextColor={colors.textSecondary}
                value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Subject code</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. MATH 101" placeholderTextColor={colors.textSecondary}
                value={form.code} onChangeText={v => setForm(f => ({ ...f, code: v }))}
              />

              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Instructor</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. Prof. Cruz" placeholderTextColor={colors.textSecondary}
                value={form.instructor} onChangeText={v => setForm(f => ({ ...f, instructor: v }))}
              />

              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Room</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="e.g. Room 302" placeholderTextColor={colors.textSecondary}
                value={form.room} onChangeText={v => setForm(f => ({ ...f, room: v }))}
              />

              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Color</Text>
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

              <View style={s.timeslotHeader}>
                <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Class schedule</Text>
                <TouchableOpacity onPress={addTimeslot} style={[s.tsAddBtn, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={[s.tsAddTxt, { color: colors.primary }]}>Add slot</Text>
                </TouchableOpacity>
              </View>

              {form.timeslots.map((ts, idx) => (
                <View key={idx} style={[s.tsRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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
                  <View style={s.tsTimeRow}>
                    <TextInput
                      style={[s.tsTimeInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                      placeholder="08:00 AM" placeholderTextColor={colors.textSecondary}
                      value={ts.startTime} onChangeText={v => updateTimeslot(idx, "startTime", v)}
                    />
                    <Text style={[s.tsTimeSep, { color: colors.textSecondary }]}>→</Text>
                    <TextInput
                      style={[s.tsTimeInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                      placeholder="09:30 AM" placeholderTextColor={colors.textSecondary}
                      value={ts.endTime} onChangeText={v => updateTimeslot(idx, "endTime", v)}
                    />
                    <TouchableOpacity onPress={() => removeTimeslot(idx)} style={s.tsRemoveBtn}>
                      <Ionicons name="close-circle" size={20} color="#E24B4A" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                onPress={handleUpdate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitTxt}>Save changes</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── COURSE DETAIL MODAL ── */}
      <Modal
        visible={detailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModal(false)}
      >
        <View style={[s.overlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View style={[s.detailSheet, { backgroundColor: colors.background }]}>
            {selectedCourse && (
              <>
                <ScheduleDetailModal
                  item={detailItem}
                  visible={detailVisible}
                  onClose={() => setDetailVisible(false)}
                  colors={colors}
                  readOnly={true}
                />

                {/* Header */}
                <View style={[s.detailHeader, {
                  borderBottomColor: colors.cardBorder,
                  borderTopColor: selectedCourse.color,
                  borderTopWidth: 4,
                }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.detailCode, { color: selectedCourse.color }]}>
                      {selectedCourse.code || "Course"}
                    </Text>
                    <Text style={[s.detailName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {selectedCourse.name}
                    </Text>
                    {selectedCourse.instructor ? (
                      <Text style={[s.detailInstructor, { color: colors.textSecondary }]}>
                        {selectedCourse.instructor}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => setDetailModal(false)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {/* Room */}
                  {selectedCourse.room ? (
                    <View style={[s.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <Ionicons name="location-outline" size={16} color={selectedCourse.color} />
                      <Text style={[s.infoTxt, { color: colors.textPrimary }]}>{selectedCourse.room}</Text>
                    </View>
                  ) : null}

                  {/* Timeslots */}
                  {selectedCourse.timeslots.length > 0 && (
                    <>
                      <Text style={[s.detailSec, { color: colors.textSecondary }]}>Class schedule</Text>
                      {selectedCourse.timeslots.map((ts, i) => (
                        <View key={i} style={[s.tsDetailRow, {
                          backgroundColor: selectedCourse.color + "15",
                          borderColor:     selectedCourse.color + "40",
                        }]}>
                          <View style={[s.tsDayBadge, { backgroundColor: selectedCourse.color }]}>
                            <Text style={s.tsDayTxt}>{ts.day.slice(0, 3)}</Text>
                          </View>
                          <Text style={[s.tsDetailTime, { color: colors.textPrimary }]}>
                            {ts.startTime} — {ts.endTime}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Stats */}
                  <Text style={[s.detailSec, { color: colors.textSecondary }]}>Activity summary</Text>
                  <View style={s.statsRow}>
                    {[
                      ["Total",   courseSchedules.length,          colors.primary],
                      ["Done",    done(courseSchedules).length,    "#639922"     ],
                      ["Pending", pending(courseSchedules).length, "#BA7517"     ],
                    ].map(([l, n, c]) => (
                      <View key={l as string} style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <Text style={[s.statNum, { color: c as string }]}>{n as number}</Text>
                        <Text style={[s.statLbl, { color: colors.textSecondary }]}>{l as string}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.cardBorder, marginHorizontal: 16, marginTop: 20, marginBottom: 4 }} />

                  {/* Schedule list */}
                  {scheduleLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                  ) : courseSchedules.length === 0 ? (
                    <View style={s.emptySchedule}>
                      <Ionicons name="document-outline" size={32} color={colors.textSecondary} />
                      <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                        No schedules linked to this course yet.
                      </Text>
                      <Text style={[s.emptySub, { color: colors.textSecondary, fontSize: 11 }]}>
                        When adding a schedule, select this course.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {pending(courseSchedules).map(item => (
                        <CourseScheduleRow
                          key={item._id} item={item} colors={colors}
                          onPress={() => openDetail(item)}
                        />
                      ))}
                      {done(courseSchedules).map(item => (
                        <CourseScheduleRow
                          key={item._id} item={item} colors={colors} isDone
                          onPress={() => openDetail(item)}
                        />
                      ))}
                    </>
                  )}

                  {/* Actions */}
                  <View style={s.detailActions}>
                    <TouchableOpacity
                      style={[s.detailActionBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => openEdit(selectedCourse)}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                      <Text style={[s.detailActionTxt, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.detailActionBtn, { backgroundColor: "#FCEBEB" }]}
                      onPress={() => handleDelete(selectedCourse)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#E24B4A" />
                      <Text style={[s.detailActionTxt, { color: "#E24B4A" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 30 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function CourseScheduleRow({ item, colors, isDone, onPress }: {
  item: ScheduleItem; colors: any; isDone?: boolean; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[crs.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }, isDone && crs.done]}
    >
      <View style={[crs.dot, { backgroundColor: TYPE_COLORS[item.type] || colors.primary }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[crs.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <View style={[crs.pill, { backgroundColor: TYPE_BG[item.type] || colors.primaryLight }]}>
            <Text style={[crs.pillTxt, { color: TYPE_COLORS[item.type] || colors.primary }]}>{item.type}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 3 }}>
          <Text style={[crs.meta, { color: colors.textSecondary }]}>{item.date}</Text>
          <Text style={[crs.meta, { color: colors.textSecondary }]}>{item.startTime}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {isDone
          ? <Ionicons name="checkmark-circle" size={18} color="#639922" />
          : <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        }
      </View>
    </TouchableOpacity>
  );
}

const crs = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 0.5, borderRadius: 12, padding: 12, marginBottom: 10, marginHorizontal: 16 },
  done:    { opacity: 0.5 },
  dot:     { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  title:   { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  pill:    { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  pillTxt: { fontSize: 10, fontWeight: "500" },
  meta:    { fontSize: 11 },
});

const s = StyleSheet.create({
  screen:           { flex: 1, padding: 16 },
  loader:           { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:        { fontSize: 14 },
  headerRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingTop: 8 },
  pageTitle:        { fontSize: 22, fontWeight: "500" },
  pageSub:          { fontSize: 12, marginTop: 3 },
  addBtn:           { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:        { color: "#fff", fontSize: 13, fontWeight: "500" },
  grid:             { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  courseCard:       { width: "47%", borderWidth: 0.5, borderRadius: 14, padding: 14, gap: 6 },
  courseCardTop:    { flexDirection: "row", alignItems: "center", gap: 6 },
  courseColorDot:   { width: 8, height: 8, borderRadius: 4 },
  courseCode:       { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  courseName:       { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  courseInstructor: { fontSize: 11 },
  timeslotPreview:  { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  timeslotTag:      { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  timeslotTagTxt:   { fontSize: 10, fontWeight: "500" },
  moreTs:           { fontSize: 10, alignSelf: "center" },
  empty:            { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 24 },
  emptyTitle:       { fontSize: 18, fontWeight: "500" },
  emptySub:         { fontSize: 13, textAlign: "center", lineHeight: 20 },
  overlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet:            { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "92%" },
  detailSheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", flex: 0.92, overflow: "hidden" },
  sheetHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle:       { fontSize: 18, fontWeight: "500" },
  fieldLbl:         { fontSize: 12, fontWeight: "500", marginBottom: 6, marginTop: 4 },
  input:            { borderWidth: 0.5, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14 },
  colorRow:         { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  colorDot:         { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  timeslotHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tsAddBtn:         { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  tsAddTxt:         { fontSize: 12, fontWeight: "500" },
  tsRow:            { borderWidth: 0.5, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  tsTimeRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  tsTimeInput:      { flex: 1, borderWidth: 0.5, borderRadius: 8, padding: 8, fontSize: 13 },
  tsTimeSep:        { fontSize: 14 },
  tsRemoveBtn:      { padding: 2 },
  dayChip:          { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dayChipTxt:       { fontSize: 11, fontWeight: "500" },
  submitBtn:        { borderRadius: 12, padding: 15, alignItems: "center", marginTop: 8, marginBottom: 10 },
  submitTxt:        { color: "#fff", fontSize: 15, fontWeight: "500" },
  detailHeader:     { flexDirection: "row", alignItems: "flex-start", padding: 20, borderBottomWidth: 0.5, gap: 12 },
  detailCode:       { fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginBottom: 3 },
  detailName:       { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  detailInstructor: { fontSize: 13, marginTop: 3 },
  detailSec:        { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 20, paddingHorizontal: 16 },
  infoRow:          { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 0.5, borderRadius: 10, padding: 12, marginHorizontal: 16, marginTop: 12 },
  infoTxt:          { fontSize: 13 },
  tsDetailRow:      { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 0.5, borderRadius: 10, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  tsDayBadge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tsDayTxt:         { fontSize: 11, fontWeight: "600", color: "#fff" },
  tsDetailTime:     { fontSize: 13, fontWeight: "500" },
  statsRow:         { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  statCard:         { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 12, alignItems: "center" },
  statNum:          { fontSize: 22, fontWeight: "500" },
  statLbl:          { fontSize: 11, marginTop: 4 },
  emptySchedule:    { alignItems: "center", paddingVertical: 30, paddingHorizontal: 16, gap: 8, marginTop: 8 },
  detailActions:    { flexDirection: "row", gap: 10, padding: 16, paddingTop: 20 },
  detailActionBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: 12 },
  detailActionTxt:  { fontSize: 13, fontWeight: "500" },
});