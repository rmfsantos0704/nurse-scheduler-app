import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
  RefreshControl, Image, FlatList, Platform,
  Animated,
} from "react-native";
import { useCallback, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useNotes } from "../../hooks/useNotes";
import { RichText } from "../../components/RichText";
import { SafeScreen } from "../../components/SafeScreen";
import { noteService, type Note } from "../../services/noteService";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Notes() {
  const { colors } = useTheme();
const {
  filtered, loading, refreshing, search,
  fetch, refresh, handleSearch, remove, removeMany,   // ← add removeMany
} = useNotes();

  // Multi-select state
  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    fetch();
    // Exit select mode on tab refocus
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []));

  // ── Single delete ────────────────────────────────────────────────────
  const handleDelete = (note: Note) => {
    Alert.alert("Delete note", `Remove "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(note._id) },
    ]);
  };

  // ── Multi select logic ───────────────────────────────────────────────
  const enterSelectMode = (id: string) => {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map(n => n._id)));
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const deleteSelected = () => {
  const count = selectedIds.size;
  const idsToDelete = Array.from(selectedIds); // snapshot before state changes

  Alert.alert(
    "Delete notes",
    `Remove ${count} note${count !== 1 ? "s" : ""}? This cannot be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: `Delete ${count}`,
        style: "destructive",
        onPress: async () => {
          // Exit select mode first
          setSelectMode(false);
          setSelectedIds(new Set());
          // Single call removes all from state and backend
          await removeMany(idsToDelete);
        },
      },
    ]
  );
};

  // ── Open editor ──────────────────────────────────────────────────────
  const openEditor = (note?: Note) => {
    if (selectMode) return;
    router.push({
      pathname: "/note-editor",
      params: note ? { id: note._id } : { id: "new" },
    });
  };

  // ── Render card ──────────────────────────────────────────────────────
  const renderNote = ({ item }: { item: Note }) => {
    const isSelected = selectedIds.has(item._id);

    return (
      <TouchableOpacity
        style={[
          nc.card,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => {
          if (selectMode) toggleSelect(item._id);
          else openEditor(item);
        }}
        onLongPress={() => {
          if (!selectMode) enterSelectMode(item._id);
          else toggleSelect(item._id);
        }}
        activeOpacity={0.8}
        delayLongPress={400}
      >
        {/* Selection checkmark overlay */}
        {selectMode && (
          <View style={[nc.checkWrap, { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: isSelected ? colors.primary : colors.cardBorder }]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}

        {/* Dim overlay when in select mode and not selected */}
        {selectMode && !isSelected && (
          <View style={nc.dimOverlay} />
        )}

        {item.images && item.images.length > 0 && (
          <Image source={{ uri: item.images[0] }} style={nc.cardImg} resizeMode="cover" />
        )}

        <View style={nc.cardBody}>
          <Text style={[nc.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.content ? (
            <RichText
              content={item.content}
              style={[nc.cardContent, { color: colors.textSecondary }]}
              numberOfLines={3}
            />
          ) : null}

          <View style={nc.cardFooter}>
            <Text style={[nc.cardTime, { color: colors.textSecondary }]}>
              {timeAgo(item.updatedAt)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {item.images && item.images.length > 0 && (
                <View style={nc.metaItem}>
                  <Ionicons name="image-outline" size={12} color={colors.textSecondary} />
                  <Text style={[nc.metaTxt, { color: colors.textSecondary }]}>{item.images.length}</Text>
                </View>
              )}
              {!selectMode && (
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.textSecondary + "88"} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={[s.loader, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading notes...</Text>
        </View>
      </SafeScreen>
    );
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <SafeScreen>
      <View style={[s.screen, { backgroundColor: colors.background }]}>

        {/* ── HEADER ── */}
        {!selectMode ? (
          <View style={s.header}>
            <View>
              <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Notes</Text>
              <Text style={[s.pageSub, { color: colors.textSecondary }]}>
                {filtered.length} note{filtered.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => openEditor()}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── SELECT MODE HEADER ── */
          <View style={[s.selectHeader, { borderBottomColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={cancelSelect} style={s.selectHeaderBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={[s.selectCount, { color: colors.textPrimary }]}>
              {selectedIds.size} selected
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={allSelected ? cancelSelect : selectAll}
                style={[s.selectActionBtn, { backgroundColor: colors.primaryLight }]}
              >
                <Text style={[s.selectActionTxt, { color: colors.primary }]}>
                  {allSelected ? "Deselect all" : "Select all"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={deleteSelected}
                disabled={selectedIds.size === 0}
                style={[s.selectActionBtn, {
                  backgroundColor: selectedIds.size > 0 ? "#FCEBEB" : colors.card,
                  opacity: selectedIds.size > 0 ? 1 : 0.4,
                }]}
              >
                <Ionicons name="trash-outline" size={16} color={selectedIds.size > 0 ? "#E24B4A" : colors.textSecondary} />
                <Text style={[s.selectActionTxt, { color: selectedIds.size > 0 ? "#E24B4A" : colors.textSecondary }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── SEARCH ── (hidden in select mode) */}
        {!selectMode && (
          <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[s.searchInput, { color: colors.textPrimary }]}
              placeholder="Search notes..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={handleSearch}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && Platform.OS === "android" && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── SELECT MODE HINT ── */}
        {selectMode && (
          <View style={[s.selectHint, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
            <Text style={[s.selectHintTxt, { color: colors.primary }]}>
              Tap notes to select · Long press to toggle
            </Text>
          </View>
        )}

        {/* ── NOTES GRID ── */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="document-text-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
              {search ? "No notes found" : "No notes yet"}
            </Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>
              {search ? `Nothing matches "${search}"` : "Tap + to write your first note"}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[s.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => openEditor()}
              >
                <Text style={s.emptyBtnTxt}>New note</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            renderItem={renderNote}
            numColumns={2}
            columnWrapperStyle={s.row}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              !selectMode
                ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
                : undefined
            }
          />
        )}
      </View>
    </SafeScreen>
  );
}

const nc = StyleSheet.create({
  card:        { flex: 1, borderWidth: 0.5, borderRadius: 16, overflow: "hidden", margin: 6, position: "relative" },
  cardImg:     { width: "100%", height: 110 },
  cardBody:    { padding: 12 },
  cardTitle:   { fontSize: 14, fontWeight: "600", marginBottom: 5, lineHeight: 20 },
  cardContent: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardFooter:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTime:    { fontSize: 11 },
  metaItem:    { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt:     { fontSize: 11 },
  checkWrap:   {
    position: "absolute", top: 8, right: 8, zIndex: 10,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  dimOverlay:  {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255,255,255,0.45)", zIndex: 5, borderRadius: 16,
  },
});

const s = StyleSheet.create({
  screen:          { flex: 1 },
  loader:          { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:       { fontSize: 14 },

  // Normal header
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  pageTitle:       { fontSize: 28, fontWeight: "700" },
  pageSub:         { fontSize: 13, marginTop: 2 },
  addBtn:          { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", elevation: 4, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  // Select mode header
  selectHeader:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, gap: 10 },
  selectHeaderBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  selectCount:     { flex: 1, fontSize: 16, fontWeight: "600" },
  selectActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  selectActionTxt: { fontSize: 13, fontWeight: "600" },

  selectHint:      { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginBottom: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  selectHintTxt:   { fontSize: 12 },

  searchWrap:      { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 14, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput:     { flex: 1, fontSize: 14, padding: 0 },
  row:             { paddingHorizontal: 10 },
  listContent:     { paddingBottom: 40 },
  empty:           { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIconWrap:   { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:      { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySub:        { fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn:        { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  emptyBtnTxt:     { color: "#fff", fontSize: 14, fontWeight: "600" },
});