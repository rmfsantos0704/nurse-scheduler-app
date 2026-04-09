import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, RefreshControl
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

const API_URL = "http://192.168.1.49:5000/api"; // 🔥 replace with your IP

type ScheduleType = "Quiz" | "Activity" | "Review" | "Class" | "Duty" | "Study";

type ScheduleItem = {
  _id: string;
  title: string;
  type: ScheduleType;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  isUrgent?: boolean;
};

const TYPE_COLORS: Record<string, string> = {
  Quiz: "#BA7517", Activity: "#639922", Review: "#7F77DD",
  Class: "#378ADD", Duty: "#D4537E", Study: "#378ADD",
};
const TYPE_BG: Record<string, string> = {
  Quiz: "#FAEEDA", Activity: "#EAF3DE", Review: "#EEEDFE",
  Class: "#E6F1FB", Duty: "#FBEAF0", Study: "#E6F1FB",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Calendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);

  const todayStr = today.toISOString().split("T")[0];

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API_URL}/schedules`);
      const data = await res.json();
      setAllSchedules(Array.isArray(data) ? data : []);
    } catch {
      // silent fail — show empty calendar
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const dateStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const schedulesForDate = (ds: string) =>
    allSchedules.filter(s => s.date === ds);

  const openDay = (ds: string) => {
    setSelectedDate(ds);
    setDayModalVisible(true);
  };

  const selectedItems = selectedDate ? schedulesForDate(selectedDate) : [];
  const selectedDone = selectedItems.filter(i => i.isCompleted);
  const selectedPending = selectedItems.filter(i => !i.isCompleted);

  const formatSelectedDate = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color="#D4537E" size="large" />
        <Text style={s.loaderTxt}>Loading calendar...</Text>
      </View>
    );
  }

  // Build calendar cells
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <ScrollView
        style={s.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4537E" />}
      >
        <Text style={s.pageTitle}>Calendar</Text>

        {/* Month nav */}
        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={20} color="#D4537E" />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={20} color="#D4537E" />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {[["Duty","#D4537E"],["Quiz","#BA7517"],["Class","#378ADD"],["Activity","#639922"],["Review","#7F77DD"]].map(([l,c])=>(
            <View key={l} style={s.legendItem}>
              <View style={[s.legendDot,{backgroundColor:c}]}/>
              <Text style={s.legendTxt}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Day headers */}
        <View style={s.grid}>
          {DAYS.map(d => (
            <View key={d} style={s.dayHeader}>
              <Text style={s.dayHeaderTxt}>{d}</Text>
            </View>
          ))}

          {/* Calendar cells */}
          {cells.map((day, idx) => {
            if (!day) return <View key={`e${idx}`} style={s.cell} />;
            const ds = dateStr(day);
            const dayItems = schedulesForDate(ds);
            const isToday = ds === todayStr;
            const hasDone = dayItems.some(i => i.isCompleted);
            const hasPending = dayItems.some(i => !i.isCompleted);
            const isSelected = ds === selectedDate;

            return (
              <TouchableOpacity
                key={ds}
                style={[
                  s.cell,
                  isToday && s.cellToday,
                  isSelected && s.cellSelected,
                ]}
                onPress={() => openDay(ds)}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.cellNum,
                  isToday && s.cellNumToday,
                  isSelected && { color: "#fff" },
                ]}>
                  {day}
                </Text>

                {/* Dot indicators */}
                {dayItems.length > 0 && (
                  <View style={s.dotRow}>
                    {hasPending && <View style={[s.cellDot, { backgroundColor: "#D4537E" }]} />}
                    {hasDone && <View style={[s.cellDot, { backgroundColor: "#639922" }]} />}
                    {dayItems.length > 2 && (
                      <Text style={s.moreIndicator}>+{dayItems.length}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Monthly summary */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: "#D4537E" }]}>
              {allSchedules.filter(s => {
                const d = new Date(s.date + "T00:00:00");
                return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
              }).length}
            </Text>
            <Text style={s.summaryLbl}>This month</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: "#639922" }]}>
              {allSchedules.filter(s => {
                const d = new Date(s.date + "T00:00:00");
                return d.getMonth() === viewMonth && d.getFullYear() === viewYear && s.isCompleted;
              }).length}
            </Text>
            <Text style={s.summaryLbl}>Completed</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: "#BA7517" }]}>
              {allSchedules.filter(s => {
                const d = new Date(s.date + "T00:00:00");
                return d.getMonth() === viewMonth && d.getFullYear() === viewYear && !s.isCompleted;
              }).length}
            </Text>
            <Text style={s.summaryLbl}>Pending</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── DAY DETAIL MODAL ─── */}
      <Modal
        visible={dayModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDayModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>
                  {selectedDate ? formatSelectedDate(selectedDate) : ""}
                </Text>
                <Text style={s.modalSub}>
                  {selectedItems.length === 0
                    ? "Nothing scheduled"
                    : `${selectedItems.length} task${selectedItems.length > 1 ? "s" : ""} · ${selectedDone.length} done`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDayModalVisible(false)}>
                <Ionicons name="close" size={22} color="#C97C95" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedItems.length === 0 ? (
                <View style={s.modalEmpty}>
                  <Ionicons name="checkmark-circle-outline" size={40} color="#ED93B1" />
                  <Text style={s.modalEmptyTxt}>Free day — nothing scheduled</Text>
                </View>
              ) : (
                <>
                  {/* Pending */}
                  {selectedPending.length > 0 && (
                    <>
                      <Text style={s.modalSectionLbl}>Pending</Text>
                      {selectedPending.map(item => (
                        <ModalItem key={item._id} item={item} />
                      ))}
                    </>
                  )}
                  {/* Completed */}
                  {selectedDone.length > 0 && (
                    <>
                      <Text style={s.modalSectionLbl}>Completed</Text>
                      {selectedDone.map(item => (
                        <ModalItem key={item._id} item={item} done />
                      ))}
                    </>
                  )}
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ModalItem({ item, done }: { item: ScheduleItem; done?: boolean }) {
  return (
    <View style={[ms.row, done && ms.rowDone]}>
      <View style={[ms.dot, { backgroundColor: TYPE_COLORS[item.type] || "#D4537E" }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={ms.title} numberOfLines={1}>{item.title}</Text>
          <View style={[ms.pill, { backgroundColor: TYPE_BG[item.type] }]}>
            <Text style={[ms.pillTxt, { color: TYPE_COLORS[item.type] }]}>{item.type}</Text>
          </View>
          {item.isUrgent && !done && (
            <View style={ms.urgentPill}>
              <Text style={ms.urgentTxt}>Urgent</Text>
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={ms.sub} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </View>
      <Text style={ms.time}>{item.startTime}</Text>
      {done && <Ionicons name="checkmark-circle" size={18} color="#639922" style={{ marginLeft: 4 }} />}
    </View>
  );
}

const ms = StyleSheet.create({
  row:       { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 11, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  rowDone:   { opacity: 0.55 },
  dot:       { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  title:     { fontSize: 14, fontWeight: "500", color: "#72243E", flexShrink: 1 },
  sub:       { fontSize: 11, color: "#C97C95", marginTop: 2 },
  time:      { fontSize: 11, fontWeight: "500", color: "#C97C95", marginLeft: 4 },
  pill:      { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  pillTxt:   { fontSize: 10, fontWeight: "500" },
  urgentPill:{ backgroundColor: "#FCEBEB", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  urgentTxt: { fontSize: 10, fontWeight: "500", color: "#791F1F" },
});

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: "#FFF5F8", padding: 16 },
  loader:         { flex: 1, backgroundColor: "#FFF5F8", alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:      { fontSize: 14, color: "#C97C95" },
  pageTitle:      { fontSize: 22, fontWeight: "500", color: "#72243E", marginBottom: 16, paddingTop: 8 },
  monthNav:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 14, padding: 12, marginBottom: 14 },
  monthLabel:     { fontSize: 16, fontWeight: "500", color: "#72243E" },
  navBtn:         { padding: 4 },
  legend:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  legendItem:     { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendTxt:      { fontSize: 11, color: "#C97C95" },
  grid:           { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#fff", borderRadius: 16, borderWidth: 0.5, borderColor: "#F4C0D1", overflow: "hidden", marginBottom: 16 },
  dayHeader:      { width: "14.28%", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#FFE4EC" },
  dayHeaderTxt:   { fontSize: 11, fontWeight: "500", color: "#C97C95" },
  cell:           { width: "14.28%", minHeight: 54, alignItems: "center", paddingTop: 8, paddingBottom: 6, borderWidth: 0.5, borderColor: "#FFF5F8" },
  cellToday:      { backgroundColor: "#FFE4EC" },
  cellSelected:   { backgroundColor: "#D4537E" },
  cellNum:        { fontSize: 14, fontWeight: "500", color: "#72243E" },
  cellNumToday:   { color: "#D4537E" },
  dotRow:         { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3 },
  cellDot:        { width: 5, height: 5, borderRadius: 3 },
  moreIndicator:  { fontSize: 9, color: "#C97C95", fontWeight: "500" },
  summaryRow:     { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard:    { flex: 1, backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#F4C0D1", borderRadius: 12, padding: 12, alignItems: "center" },
  summaryNum:     { fontSize: 22, fontWeight: "500" },
  summaryLbl:     { fontSize: 11, color: "#C97C95", marginTop: 4 },
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalSheet:     { backgroundColor: "#FFF5F8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalTitle:     { fontSize: 16, fontWeight: "500", color: "#72243E", maxWidth: 260 },
  modalSub:       { fontSize: 12, color: "#C97C95", marginTop: 3 },
  modalSectionLbl:{ fontSize: 11, fontWeight: "500", color: "#C97C95", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 6 },
  modalEmpty:     { alignItems: "center", paddingVertical: 36, gap: 10 },
  modalEmptyTxt:  { fontSize: 14, color: "#C97C95" },
});