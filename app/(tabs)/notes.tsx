import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
  RefreshControl, Image, FlatList, Platform,
} from "react-native";
import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useNotes } from "../../hooks/useNotes";
import { RichText } from "../../components/RichText";
import type { Note } from "../../services/noteService";

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
    fetch, refresh, handleSearch, remove,
  } = useNotes();

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const handleDelete = (note: Note) => {
    Alert.alert("Delete note", `Remove "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(note._id) },
    ]);
  };

  const openEditor = (note?: Note) => {
    router.push({
      pathname: "/note-editor",
      params: note ? { id: note._id } : { id: "new" },
    });
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[nc.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => openEditor(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.8}
      delayLongPress={500}
    >
      {/* Image preview */}
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
            formatting={item.formatting || []}
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
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={15} color={colors.textSecondary + "88"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === "ios" ? 56 : 36 }]}>
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

      {/* Search */}
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

      {/* List */}
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
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const nc = StyleSheet.create({
  card:       { flex: 1, borderWidth: 0.5, borderRadius: 16, overflow: "hidden", margin: 6 },
  cardImg:    { width: "100%", height: 110 },
  cardBody:   { padding: 12 },
  cardTitle:  { fontSize: 14, fontWeight: "600", marginBottom: 5, lineHeight: 20 },
  cardContent:{ fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTime:   { fontSize: 11 },
  metaItem:   { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt:    { fontSize: 11 },
});

const s = StyleSheet.create({
  screen:       { flex: 1 },
  loader:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:    { fontSize: 14 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 14 },
  pageTitle:    { fontSize: 28, fontWeight: "700" },
  pageSub:      { fontSize: 13, marginTop: 2 },
  addBtn:       { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", elevation: 4, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 14, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  row:          { paddingHorizontal: 10 },
  listContent:  { paddingBottom: 40 },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIconWrap:{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:   { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySub:     { fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn:     { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  emptyBtnTxt:  { color: "#fff", fontSize: 14, fontWeight: "600" },
});