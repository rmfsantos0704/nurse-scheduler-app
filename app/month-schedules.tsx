// app/month-schedules.tsx
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, Platform, ActivityIndicator,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { scheduleService, ScheduleItem } from "../services/scheduleService";
import { ScheduleDetailModal } from "../components/ScheduleDetailModal";
import { SafeScreen } from "../components/SafeScreen";
import { isPastDateTime, getTypeColor, getTypeBg, buildDateTime } from "../utils/dateUtils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type FilterKey = "all" | "pending" | "done" | "overdue" | "done-late";
type SortKey   = "date-asc" | "date-desc" | "title" | "type";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all",       label: "All",       color: "#888"    },
  { key: "pending",   label: "Pending",   color: "#BA7517" },
  { key: "done",      label: "Done",      color: "#639922" },
  { key: "overdue",   label: "Overdue",   color: "#E24B4A" },
  { key: "done-late", label: "Done late", color: "#7F77DD" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "date-asc",  label: "Date ↑" },
  { key: "date-desc", label: "Date ↓" },
  { key: "title",     label: "Title"  },
  { key: "type",      label: "Type"   },
];

function getStatus(item: ScheduleItem): FilterKey {
  if (!item.isCompleted) {
    return isPastDateTime(item.date, item.startTime) ? "overdue" : "pending";
  }
  if (item.completedAt) {
    const scheduled = buildDateTime(item.date, item.startTime);
    const completed = new Date(item.completedAt);
    return completed > scheduled ? "done-late" : "done";
  }
  return "done";
}

// ✅ Shared helper — dark mode pill styles derived from the type color
function getTypePillStyles(
  typeColor: string,
  typeBg: string,
  mode: string
): { bg: string; text: string; borderColor?: string; hasBorder: boolean } {
  if (mode === "dark") {
    return {
      bg:          typeColor + "30",  // ~19% opacity tint on dark surface
      text:        typeColor,         // vivid type color for readability
      borderColor: typeColor + "60",  // subtle outline to define the pill edge
      hasBorder:   true,
    };
  }
  return { bg: typeBg, text: typeColor, hasBorder: false };
}

export default function MonthSchedules() {
  const { colors, mode } = useTheme(); // 👈 pull in mode
  const params = useLocalSearchParams<{ month: string; year: string }>();
  const month  = parseInt(params.month ?? "0");
  const year   = parseInt(params.year  ?? String(new Date().getFullYear()));

  const [items,         setItems]         = useState<ScheduleItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>("all");
  const [activeSort,    setActiveSort]    = useState<SortKey>("date-asc");
  const [sortOpen,      setSortOpen]      = useState(false);
  const [detailItem,    setDetailItem]    = useState<ScheduleItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => { loadItems(); }, [month, year]);

  const loadItems = async () => {
    try {
      const all = await scheduleService.getAll();
      const monthItems = all.filter(s => {
        const d = new Date(s.date + "T00:00:00");
        return d.getMonth() === month && d.getFullYear() === year;
      });
      setItems(monthItems);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const displayed = useMemo(() => {
    let list = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        (i.code  ?? "").toLowerCase().includes(q) ||
        (i.color ?? "").toLowerCase().includes(q)
      );
    }

    if (activeFilter !== "all") {
      list = list.filter(i => getStatus(i) === activeFilter);
    }

    list.sort((a, b) => {
      switch (activeSort) {
        case "date-asc":  return a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? "");
        case "date-desc": return b.date.localeCompare(a.date) || (b.startTime ?? "").localeCompare(a.startTime ?? "");
        case "title":     return a.title.localeCompare(b.title);
        case "type":      return a.type.localeCompare(b.type);
        default:          return 0;
      }
    });

    return list;
  }, [items, search, activeFilter, activeSort]);

  const grouped = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    for (const item of displayed) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return Object.entries(map).sort(([a], [b]) =>
      activeSort === "date-desc" ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [displayed, activeSort]);

  type Row = { type: "header"; date: string } | { type: "item"; item: ScheduleItem };
  const rows: Row[] = useMemo(() => {
    if (activeSort === "title" || activeSort === "type") {
      return displayed.map(item => ({ type: "item" as const, item }));
    }
    const result: Row[] = [];
    for (const [date, dayItems] of grouped) {
      result.push({ type: "header", date });
      dayItems.forEach(item => result.push({ type: "item", item }));
    }
    return result;
  }, [grouped, displayed, activeSort]);

  const now      = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const statusColor: Record<FilterKey, string> = {
    all:        colors.primary,
    pending:    "#BA7517",
    done:       "#639922",
    overdue:    "#E24B4A",
    "done-late":"#7F77DD",
  };

  const renderRow = ({ item: row }: { item: Row }) => {
    if (row.type === "header") {
      const [y, m, d] = row.date.split("-").map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString([], {
        weekday: "short", month: "short", day: "numeric",
      });
      const isToday = row.date === todayStr;
      return (
        <View style={[rs.dateHeader, { borderLeftColor: isToday ? colors.primary : colors.cardBorder }]}>
          <Text style={[rs.dateLabel, { color: isToday ? colors.primary : colors.textSecondary }]}>
            {isToday ? `Today · ${label}` : label}
          </Text>
        </View>
      );
    }

    const { item }  = row;
    const status    = getStatus(item);
    const overdue   = status === "overdue";
    const doneLate  = status === "done-late";
    const cardBorderColor = overdue ? "#E24B4A" : doneLate ? "#7F77DD" : colors.cardBorder;

    // ✅ Compute pill styles once per card using the shared helper
    const typeColor = getTypeColor(item.type);
    const typeBg    = getTypeBg(item.type);
    const pill      = getTypePillStyles(typeColor, typeBg, mode);

    return (
      <TouchableOpacity
        style={[rs.card, { backgroundColor: colors.card, borderColor: cardBorderColor }]}
        onPress={() => { setDetailItem(item); setDetailVisible(true); }}
        activeOpacity={0.75}
      >
        {/* Left accent bar */}
        <View style={[rs.accent, { backgroundColor: statusColor[status] }]} />

        <View style={rs.cardBody}>
          {/* Title row */}
          <View style={rs.titleRow}>
            <Text style={[rs.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>

            {/* ✅ Type pill — dark-mode aware */}
            <View style={[
              rs.typePill,
              { backgroundColor: pill.bg },
              pill.hasBorder && { borderWidth: 0.5, borderColor: pill.borderColor },
            ]}>
              <Text style={[rs.typeTxt, { color: pill.text }]}>{item.type}</Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={rs.metaRow}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[rs.meta, { color: colors.textSecondary }]}>{item.startTime}</Text>

            {item.isUrgent && (
              <View style={[
                rs.urgentPill,
                // ✅ Urgent pill also gets a dark-mode boost
                mode === "dark" && { backgroundColor: "rgba(250,199,117,0.2)", borderWidth: 0.5, borderColor: "rgba(250,199,117,0.5)" },
              ]}>
                <Text style={[
                  rs.urgentTxt,
                  mode === "dark" && { color: "#FAC775" },
                ]}>Urgent</Text>
              </View>
            )}

            <View style={[rs.statusPill, { backgroundColor: statusColor[status] + "22" }]}>
              <Text style={[rs.statusTxt, { color: statusColor[status] }]}>
                {status === "done-late" ? "Done late" : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={[rs.desc, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ alignSelf: "center" }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeScreen edges={["top", "bottom"]}>
      {/* ── HEADER ── */}
      <View style={[s.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
            {MONTHS[month]} {year}
          </Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            {items.length} schedule{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.sortBtn, {
            backgroundColor: sortOpen ? colors.primaryLight : colors.card,
            borderColor: colors.cardBorder,
          }]}
          onPress={() => setSortOpen(v => !v)}
        >
          <Ionicons name="funnel-outline" size={16} color={sortOpen ? colors.primary : colors.textPrimary} />
          <Text style={[s.sortBtnTxt, { color: sortOpen ? colors.primary : colors.textPrimary }]}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* ── SORT DROPDOWN ── */}
      {sortOpen && (
        <View style={[s.sortDropdown, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {SORTS.map(sort => (
            <TouchableOpacity
              key={sort.key}
              style={[s.sortOption, { borderBottomColor: colors.cardBorder }]}
              onPress={() => { setActiveSort(sort.key); setSortOpen(false); }}
            >
              <Text style={[s.sortOptionTxt, {
                color:      activeSort === sort.key ? colors.primary : colors.textPrimary,
                fontWeight: activeSort === sort.key ? "600" : "400",
              }]}>
                {sort.label}
              </Text>
              {activeSort === sort.key && (
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── SEARCH ── */}
      <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="Search schedules..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS === "android" && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTER CHIPS ── */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          const count  = f.key === "all"
            ? items.length
            : items.filter(i => getStatus(i) === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[s.filterChip, {
                backgroundColor: active ? f.color : colors.card,
                borderColor:     active ? f.color : colors.cardBorder,
              }]}
            >
              <Text style={[s.filterTxt, { color: active ? "#fff" : colors.textSecondary }]}>
                {f.label}
              </Text>
              <View style={[s.filterCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.primaryLight }]}>
                <Text style={[s.filterCountTxt, { color: active ? "#fff" : colors.primary }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── LIST ── */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={44} color={colors.primary + "55"} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Nothing found</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>
            Try a different filter or search term
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, idx) =>
            row.type === "header" ? `h-${row.date}` : `i-${row.item._id}-${idx}`
          }
          renderItem={renderRow}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ScheduleDetailModal
        item={detailItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors}
        readOnly={true}
      />
    </SafeScreen>
  );
}

const rs = StyleSheet.create({
  dateHeader: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3, paddingLeft: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  dateLabel:  { fontSize: 13, fontWeight: "600" },
  card:       { flexDirection: "row", borderWidth: 0.5, borderRadius: 14, marginHorizontal: 16, marginBottom: 8, overflow: "hidden" },
  accent:     { width: 4 },
  cardBody:   { flex: 1, padding: 12 },
  titleRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  title:      { fontSize: 14, fontWeight: "600", flex: 1 },
  typePill:   { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  typeTxt:    { fontSize: 10, fontWeight: "500" },
  metaRow:    { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  meta:       { fontSize: 12 },
  urgentPill: { backgroundColor: "#FAEEDA", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  urgentTxt:  { fontSize: 10, fontWeight: "500", color: "#633806" },
  statusPill: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  statusTxt:  { fontSize: 10, fontWeight: "600" },
  desc:       { fontSize: 12, marginTop: 4 },
});

const s = StyleSheet.create({
  header:        { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontSize: 17, fontWeight: "600" },
  headerSub:     { fontSize: 12, marginTop: 1 },
  sortBtn:       { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  sortBtnTxt:    { fontSize: 13, fontWeight: "500" },
  sortDropdown:  { borderWidth: 0.5, borderRadius: 12, marginHorizontal: 16, marginTop: 8, overflow: "hidden" },
  sortOption:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5 },
  sortOptionTxt: { fontSize: 14 },
  searchWrap:    { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginVertical: 12, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput:   { flex: 1, fontSize: 14, padding: 0 },
  filterRow:     { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10, flexWrap: "wrap" },
  filterChip:    { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  filterTxt:     { fontSize: 12, fontWeight: "500" },
  filterCount:   { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountTxt:{ fontSize: 11, fontWeight: "600" },
  loader:        { flex: 1, alignItems: "center", justifyContent: "center" },
  empty:         { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  emptyTitle:    { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySub:      { fontSize: 13, textAlign: "center", lineHeight: 20 },
  listContent:   { paddingBottom: 40 },
});