import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { formatDate, getTypeColor, getTypeBg, isPastDateTime } from "../../utils/dateUtils";
import { useTheme } from "../../context/ThemeContext";
import { ScheduleDetailModal } from "../../components/ScheduleDetailModal";
import { SafeScreen } from "../../components/SafeScreen";
import { scheduleService } from "../../services/scheduleService";

type ScheduleItem = {
  _id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  description?: string;
  isCompleted: boolean;
  isUrgent?: boolean;
};

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Calendar() {
  const { colors } = useTheme();
  const today = new Date();

  const [viewYear,        setViewYear]        = useState(today.getFullYear());
  const [viewMonth,       setViewMonth]       = useState(today.getMonth());
  const [allSchedules,    setAllSchedules]    = useState<ScheduleItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [detailItem,      setDetailItem]      = useState<ScheduleItem | null>(null);
  const [detailVisible,   setDetailVisible]   = useState(false);

 const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const openDetail = (item: ScheduleItem) => { setDetailItem(item); setDetailVisible(true); };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const fetchAll = async () => {
    try {
      // ── OFFLINE: read all from SQLite ──
      const data = await scheduleService.getAll();
      setAllSchedules(data as ScheduleItem[]);
    } catch (e) {
      console.warn("Calendar fetchAll error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Calendar grid
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const makeDateStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const schedulesForDate = (ds: string) => allSchedules.filter(s => s.date === ds);
  const openDay = (ds: string) => { setSelectedDate(ds); setDayModalVisible(true); };

  const selectedItems  = selectedDate ? schedulesForDate(selectedDate) : [];
  const selectedDone   = selectedItems.filter(i => i.isCompleted);
  const selectedPending = selectedItems.filter(i => !i.isCompleted);
  const selectedOverdue = selectedItems.filter(i => !i.isCompleted && isPastDateTime(i.date, i.startTime));
  const totalOverdue    = allSchedules.filter(s => !s.isCompleted && isPastDateTime(s.date, s.startTime)).length;

  const formatSelectedDate = (ds: string) => {
    if (!ds) return "";
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString([], {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <>
      <ScheduleDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors}
        readOnly={true}
      />

      <SafeScreen edges={["top", "bottom"]}>
        <ScrollView
          style={[s.screen, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Page title + overdue badge */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Calendar</Text>
            {totalOverdue > 0 && (
              <View style={{ backgroundColor: "#E24B4A", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="warning" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{totalOverdue} overdue</Text>
              </View>
            )}
          </View>

          {/* Month nav */}
          <View style={[s.monthNav, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[s.monthLabel, { color: colors.textPrimary }]}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {[["Duty","#D4537E"],["Quiz","#BA7517"],["Class","#c5cf08"],["Activity","rgb(31,160,160)"],["Review","#7F77DD"],["General","#21a702"]].map(([l,c]) => (
              <View key={l} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: c }]} />
                <Text style={[s.legendTxt, { color: colors.textSecondary }]}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View style={[s.grid, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {DAYS.map(d => (
              <View key={d} style={[s.dayHeader, { borderBottomColor: colors.primaryLight }]}>
                <Text style={[s.dayHeaderTxt, { color: colors.textSecondary }]}>{d}</Text>
              </View>
            ))}

            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={[s.cell, { borderColor: colors.background }]} />;
              const ds       = makeDateStr(day);
              const dayItems = schedulesForDate(ds);
              const isToday  = ds === todayStr;
              const hasDone  = dayItems.some(i => i.isCompleted);
              const hasPend  = dayItems.some(i => !i.isCompleted);
              const isSel    = ds === selectedDate;

              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    s.cell,
                    { borderColor: colors.background },
                    isToday && { backgroundColor: colors.primaryLight },
                    isSel   && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => openDay(ds)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.cellNum,
                    { color: colors.textPrimary },
                    isToday && { color: colors.primary },
                    isSel   && { color: "#fff" },
                  ]}>
                    {day}
                  </Text>
                  {dayItems.length > 0 && (
                    <View style={s.dotRow}>
                      {hasPend && <View style={[s.cellDot, { backgroundColor: colors.primary }]} />}
                      {hasDone && <View style={[s.cellDot, { backgroundColor: "#639922" }]} />}
                      {dayItems.length > 2 && (
                        <Text style={[s.moreIndicator, { color: colors.textSecondary }]}>+{dayItems.length}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Monthly summary */}
          <View style={s.summaryRow}>
            {[
              { label: "This month", color: colors.primary,  value: allSchedules.filter(s => { const d = new Date(s.date + "T00:00:00"); return d.getMonth() === viewMonth && d.getFullYear() === viewYear; }).length },
              { label: "Completed",  color: "#639922",        value: allSchedules.filter(s => { const d = new Date(s.date + "T00:00:00"); return d.getMonth() === viewMonth && d.getFullYear() === viewYear && s.isCompleted; }).length },
              { label: "Pending",    color: "#BA7517",        value: allSchedules.filter(s => { const d = new Date(s.date + "T00:00:00"); return d.getMonth() === viewMonth && d.getFullYear() === viewYear && !s.isCompleted; }).length },
            ].map(({ label, color, value }) => (
              <View key={label} style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[s.summaryNum, { color }]}>{value}</Text>
                <Text style={[s.summaryLbl, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* View all month button */}
          <TouchableOpacity
            style={[s.monthBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: "/month-schedules",
              params: { month: String(viewMonth), year: String(viewYear) },
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="list-outline" size={18} color="#fff" />
            <Text style={s.monthBtnTxt}>View all {MONTHS[viewMonth]} schedules</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeScreen>

      {/* Day detail modal */}
      <Modal visible={dayModalVisible} animationType="slide" transparent onRequestClose={() => setDayModalVisible(false)}>
        <View style={[s.modalOverlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <View style={[s.modalSheet, { backgroundColor: colors.background }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                  {selectedDate ? formatSelectedDate(selectedDate) : ""}
                </Text>
                <Text style={[s.modalSub, { color: colors.textSecondary }]}>
                  {selectedItems.length === 0
                    ? "Nothing scheduled"
                    : selectedOverdue.length > 0
                    ? `${selectedItems.length} task${selectedItems.length > 1 ? "s" : ""} · ${selectedOverdue.length} overdue · ${selectedDone.length} done`
                    : `${selectedItems.length} task${selectedItems.length > 1 ? "s" : ""} · ${selectedDone.length} done`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDayModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedItems.length === 0 ? (
                <View style={s.modalEmpty}>
                  <Ionicons name="checkmark-circle-outline" size={40} color={colors.primaryDark} />
                  <Text style={[s.modalEmptyTxt, { color: colors.textSecondary }]}>Free day — nothing scheduled</Text>
                </View>
              ) : (
                <>
                  {selectedOverdue.map(item => (
                    <ModalItem key={item._id} item={item} overdue themeColors={colors} onPress={() => openDetail(item)} />
                  ))}
                  {selectedPending.filter(i => !isPastDateTime(i.date, i.startTime)).map(item => (
                    <ModalItem key={item._id} item={item} themeColors={colors} onPress={() => openDetail(item)} />
                  ))}
                  {selectedDone.map(item => (
                    <ModalItem key={item._id} item={item} done themeColors={colors} onPress={() => openDetail(item)} />
                  ))}
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

function ModalItem({ item, done, overdue, themeColors, onPress }: {
  item: ScheduleItem; done?: boolean; overdue?: boolean; themeColors: any; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[ms.row, {
        backgroundColor: themeColors.card,
        borderColor: overdue ? "#E24B4A" : themeColors.cardBorder,
      }, done && ms.rowDone, overdue && ms.rowOverdue]}
    >
      <View style={[ms.dot, { backgroundColor: overdue ? "#E24B4A" : getTypeColor(item.type) }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={[ms.title, { color: overdue ? "#E24B4A" : themeColors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[ms.pill, { backgroundColor: overdue ? "#FCEBEB" : getTypeBg(item.type) }]}>
            <Text style={[ms.pillTxt, { color: overdue ? "#E24B4A" : getTypeColor(item.type) }]}>{item.type}</Text>
          </View>
          {(item.isUrgent || overdue) && !done && (
            <View style={ms.urgentPill}>
              <Text style={ms.urgentTxt}>{overdue ? "Overdue" : "Urgent"}</Text>
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={[ms.sub, { color: themeColors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[ms.time, { color: overdue ? "#E24B4A" : themeColors.textSecondary }]}>{item.startTime}</Text>
        {done
          ? <Ionicons name="checkmark-circle" size={18} color="#639922" />
          : <Ionicons name="chevron-forward" size={14} color={themeColors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );
}

const ms = StyleSheet.create({
  row:        { borderWidth: 0.5, borderRadius: 11, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  rowDone:    { opacity: 0.55 },
  rowOverdue: { borderWidth: 1.5 },
  dot:        { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  title:      { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  sub:        { fontSize: 11, marginTop: 2 },
  time:       { fontSize: 11, fontWeight: "500", marginLeft: 4 },
  pill:       { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  pillTxt:    { fontSize: 10, fontWeight: "500" },
  urgentPill: { backgroundColor: "#FCEBEB", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  urgentTxt:  { fontSize: 10, fontWeight: "500", color: "#791F1F" },
});

const s = StyleSheet.create({
  screen:         { flex: 1, padding: 16 },
  loader:         { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:      { fontSize: 14 },
  pageTitle:      { fontSize: 22, fontWeight: "500", marginBottom: 16, paddingTop: 8 },
  monthNav:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 0.5, borderRadius: 14, padding: 12, marginBottom: 14 },
  monthLabel:     { fontSize: 16, fontWeight: "500" },
  navBtn:         { padding: 4 },
  legend:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  legendItem:     { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendTxt:      { fontSize: 11 },
  grid:           { flexDirection: "row", flexWrap: "wrap", borderRadius: 16, borderWidth: 0.5, overflow: "hidden", marginBottom: 16 },
  dayHeader:      { width: "14.28%", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5 },
  dayHeaderTxt:   { fontSize: 11, fontWeight: "500" },
  cell:           { width: "14.28%", minHeight: 54, alignItems: "center", paddingTop: 8, paddingBottom: 6, borderWidth: 0.5 },
  cellNum:        { fontSize: 14, fontWeight: "500" },
  dotRow:         { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3 },
  cellDot:        { width: 5, height: 5, borderRadius: 3 },
  moreIndicator:  { fontSize: 9, fontWeight: "500" },
  summaryRow:     { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard:    { flex: 1, borderWidth: 0.5, borderRadius: 12, padding: 12, alignItems: "center" },
  summaryNum:     { fontSize: 22, fontWeight: "500" },
  summaryLbl:     { fontSize: 11, marginTop: 4 },
  monthBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 25, paddingVertical: 15, marginBottom: 20 },
  monthBtnTxt:    { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay:   { flex: 1, justifyContent: "flex-end" },
  modalSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalTitle:     { fontSize: 16, fontWeight: "500", maxWidth: 260 },
  modalSub:       { fontSize: 12, marginTop: 3 },
  modalEmpty:     { alignItems: "center", paddingVertical: 36, gap: 10 },
  modalEmptyTxt:  { fontSize: 14 },
});