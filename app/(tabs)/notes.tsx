import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, TextInput, Alert, ActivityIndicator,
  RefreshControl, Image, FlatList, KeyboardAvoidingView,
  Platform, Dimensions,
} from "react-native";
import { useState, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";
import { API_URL } from "../../constants/apiUrl";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Note = {
  _id: string;
  title: string;
  description: string;
  images: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
};

// Soft note card colors
const NOTE_COLORS = [
  "#FFFFFF", "#FFF9C4", "#E8F5E9", "#E3F2FD",
  "#FCE4EC", "#F3E5F5", "#FBE9E7", "#E0F7FA",
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Notes() {
  const { colors } = useTheme();
  const [notes, setNotes]               = useState<Note[]>([]);
  const [filtered, setFiltered]         = useState<Note[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModal, setViewModal]       = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [saving, setSaving]             = useState(false);
  const [imageModal, setImageModal]     = useState<string | null>(null);

  // Form state
  const [fTitle,  setFTitle]  = useState("");
  const [fDesc,   setFDesc]   = useState("");
  const [fImages, setFImages] = useState<string[]>([]);
  const [fColor,  setFColor]  = useState(NOTE_COLORS[0]);

  // ─── FETCH ───────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [])
  );

  const fetchNotes = async () => {
    try {
      const res  = await fetch(`${API_URL}/notes`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setNotes(list);
      setFiltered(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchNotes(); };

  // ─── SEARCH — fires on every keystroke ───────────────────────────────
  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(notes);
      return;
    }
    const q = text.toLowerCase();
    setFiltered(
      notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q)
      )
    );
  };

  // ─── IMAGE PICKER ────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access in settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.75,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setFImages(prev => [...prev, ...uris]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access in settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      setFImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (idx: number) => {
    setFImages(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── CREATE ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!fTitle.trim()) {
      Alert.alert("Required", "Please enter a title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fTitle.trim(),
          description: fDesc.trim(),
          images: fImages,
          color: fColor,
        }),
      });
      const created: Note = await res.json();
      const updated = [created, ...notes];
      setNotes(updated);
      setFiltered(updated);
      closeModal();
    } catch {
      Alert.alert("Error", "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  // ─── UPDATE ──────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedNote || !fTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/notes/${selectedNote._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fTitle.trim(),
          description: fDesc.trim(),
          images: fImages,
          color: fColor,
        }),
      });
      const updated: Note = await res.json();
      const newList = notes.map(n => n._id === updated._id ? updated : n);
      setNotes(newList);
      handleSearch(search); // re-apply search filter
      setSelectedNote(updated);
      setEditMode(false);
    } catch {
      Alert.alert("Error", "Could not update note.");
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE ──────────────────────────────────────────────────────────
  const handleDelete = (note: Note) => {
    Alert.alert("Delete note", `Remove "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const newList = notes.filter(n => n._id !== note._id);
          setNotes(newList);
          setFiltered(newList);
          setViewModal(false);
          await fetch(`${API_URL}/notes/${note._id}`, { method: "DELETE" }).catch(() => {});
        },
      },
    ]);
  };

  // ─── MODAL HELPERS ───────────────────────────────────────────────────
  const openCreate = () => {
    setFTitle(""); setFDesc(""); setFImages([]); setFColor(NOTE_COLORS[0]);
    setEditMode(false);
    setModalVisible(true);
  };

  const openView = (note: Note) => {
    setSelectedNote(note);
    setEditMode(false);
    setViewModal(true);
  };

  const openEditMode = (note: Note) => {
    setFTitle(note.title);
    setFDesc(note.description);
    setFImages([...note.images]);
    setFColor(note.color || NOTE_COLORS[0]);
    setEditMode(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFTitle(""); setFDesc(""); setFImages([]); setFColor(NOTE_COLORS[0]);
  };

  const closeView = () => {
    setViewModal(false);
    setEditMode(false);
    setSelectedNote(null);
  };

  // ─── RENDER NOTE CARD ────────────────────────────────────────────────
  const renderNote = ({ item }: { item: Note }) => {
    const cardBg = item.color && item.color !== "#FFFFFF"
      ? item.color
      : colors.card;

    return (
      <TouchableOpacity
        style={[nc.card, { backgroundColor: cardBg, borderColor: colors.cardBorder }]}
        onPress={() => openView(item)}
        activeOpacity={0.8}
      >
        {/* Image preview strip */}
        {item.images.length > 0 && (
          <Image
            source={{ uri: item.images[0] }}
            style={nc.cardImg}
            resizeMode="cover"
          />
        )}

        <View style={nc.cardBody}>
          <Text style={[nc.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[nc.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          <View style={nc.cardFooter}>
            <Text style={[nc.cardTime, { color: colors.textSecondary }]}>
              {timeAgo(item.updatedAt)}
            </Text>
            {item.images.length > 1 && (
              <View style={nc.imgCount}>
                <Ionicons name="image-outline" size={12} color={colors.textSecondary} />
                <Text style={[nc.imgCountTxt, { color: colors.textSecondary }]}>
                  {item.images.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loaderTxt, { color: colors.textSecondary }]}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Notes</Text>
            <Text style={[s.pageSub, { color: colors.textSecondary }]}>
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── SEARCH BAR ── */}
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search notes..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS === "android" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── NOTES GRID ── */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={52} color={colors.primary + "66"} />
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
              {search ? "No notes found" : "No notes yet"}
            </Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>
              {search
                ? `Nothing matches "${search}"`
                : "Tap + to create your first note"}
            </Text>
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          />
        )}
      </View>

      {/* ── CREATE MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={s.modalOuter}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[s.modalSheet, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>New note</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Color picker */}
              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Card color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 10, paddingVertical: 4 }}>
                  {NOTE_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setFColor(c)}
                      style={[
                        s.colorSwatch,
                        { backgroundColor: c, borderColor: fColor === c ? colors.primary : colors.cardBorder },
                        fColor === c && s.colorSwatchActive,
                      ]}
                    >
                      {fColor === c && (
                        <Ionicons name="checkmark" size={16} color={c === "#FFFFFF" ? "#333" : "#fff"} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Title */}
              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="Note title"
                placeholderTextColor={colors.textSecondary}
                value={fTitle}
                onChangeText={setFTitle}
                autoFocus
              />

              {/* Description */}
              <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Content</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder="Write your note here..."
                placeholderTextColor={colors.textSecondary}
                value={fDesc}
                onChangeText={setFDesc}
                multiline
                textAlignVertical="top"
              />

              {/* Images */}
              {fImages.length > 0 && (
                <>
                  <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>
                    Photos ({fImages.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {fImages.map((uri, idx) => (
                        <View key={idx} style={s.imgThumbWrap}>
                          <Image source={{ uri }} style={s.imgThumb} resizeMode="cover" />
                          <TouchableOpacity
                            style={s.imgRemoveBtn}
                            onPress={() => removeImage(idx)}
                          >
                            <Ionicons name="close-circle" size={20} color="#E24B4A" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Image buttons */}
              <View style={s.imgBtnRow}>
                <TouchableOpacity
                  style={[s.imgBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={[s.imgBtnTxt, { color: colors.primary }]}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.imgBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={[s.imgBtnTxt, { color: colors.primary }]}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnTxt}>Save note</Text>}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── VIEW / EDIT MODAL ── */}
      <Modal visible={viewModal} animationType="slide" transparent onRequestClose={closeView}>
        <KeyboardAvoidingView
          style={s.modalOuter}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {selectedNote && (
            <View style={[
              s.viewSheet,
              { backgroundColor: selectedNote.color && selectedNote.color !== "#FFFFFF" ? selectedNote.color : colors.background },
            ]}>
              {/* View header */}
              <View style={s.viewHeader}>
                <TouchableOpacity onPress={closeView} style={s.viewHeaderBtn}>
                  <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {!editMode ? (
                    <>
                      <TouchableOpacity
                        style={[s.viewHeaderBtn, { backgroundColor: colors.primaryLight }]}
                        onPress={() => openEditMode(selectedNote)}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.viewHeaderBtn, { backgroundColor: "#FCEBEB" }]}
                        onPress={() => handleDelete(selectedNote)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#E24B4A" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[s.viewHeaderBtn, { backgroundColor: colors.card }]}
                        onPress={() => setEditMode(false)}
                      >
                        <Ionicons name="close-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.viewHeaderBtn, { backgroundColor: colors.primary }]}
                        onPress={handleUpdate}
                        disabled={saving}
                      >
                        {saving
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Ionicons name="checkmark" size={18} color="#fff" />
                        }
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Color picker in edit mode */}
                {editMode && (
                  <>
                    <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Card color</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", gap: 10, paddingVertical: 4 }}>
                        {NOTE_COLORS.map(c => (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setFColor(c)}
                            style={[
                              s.colorSwatch,
                              { backgroundColor: c, borderColor: fColor === c ? colors.primary : colors.cardBorder },
                              fColor === c && s.colorSwatchActive,
                            ]}
                          >
                            {fColor === c && (
                              <Ionicons name="checkmark" size={16} color={c === "#FFFFFF" ? "#333" : "#fff"} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                {/* Title */}
                {editMode ? (
                  <>
                    <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Title</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                      value={fTitle}
                      onChangeText={setFTitle}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </>
                ) : (
                  <Text style={[s.viewTitle, { color: colors.textPrimary }]}>
                    {selectedNote.title}
                  </Text>
                )}

                {/* Timestamp */}
                <Text style={[s.viewTime, { color: colors.textSecondary }]}>
                  {editMode ? "Editing..." : `Updated ${timeAgo(selectedNote.updatedAt)}`}
                </Text>

                {/* Description */}
                {editMode ? (
                  <>
                    <Text style={[s.fieldLbl, { color: colors.textSecondary }]}>Content</Text>
                    <TextInput
                      style={[s.input, s.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                      value={fDesc}
                      onChangeText={setFDesc}
                      multiline
                      textAlignVertical="top"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </>
                ) : (
                  selectedNote.description ? (
                    <Text style={[s.viewDesc, { color: colors.textPrimary }]}>
                      {selectedNote.description}
                    </Text>
                  ) : (
                    <Text style={[s.viewDescEmpty, { color: colors.textSecondary }]}>
                      No content
                    </Text>
                  )
                )}

                {/* Images */}
                {(editMode ? fImages : selectedNote.images).length > 0 && (
                  <>
                    <Text style={[s.fieldLbl, { color: colors.textSecondary, marginTop: 16 }]}>
                      Photos ({(editMode ? fImages : selectedNote.images).length})
                    </Text>
                    <View style={s.imgGrid}>
                      {(editMode ? fImages : selectedNote.images).map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => !editMode && setImageModal(uri)}
                          style={s.imgGridItem}
                          activeOpacity={editMode ? 1 : 0.85}
                        >
                          <Image source={{ uri }} style={s.imgGridImg} resizeMode="cover" />
                          {editMode && (
                            <TouchableOpacity
                              style={s.imgRemoveBtn}
                              onPress={() => removeImage(idx)}
                            >
                              <Ionicons name="close-circle" size={22} color="#E24B4A" />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Add more images in edit mode */}
                {editMode && (
                  <View style={[s.imgBtnRow, { marginTop: 12 }]}>
                    <TouchableOpacity
                      style={[s.imgBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera-outline" size={20} color={colors.primary} />
                      <Text style={[s.imgBtnTxt, { color: colors.primary }]}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.imgBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                      onPress={pickImage}
                    >
                      <Ionicons name="image-outline" size={20} color={colors.primary} />
                      <Text style={[s.imgBtnTxt, { color: colors.primary }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ height: 50 }} />
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── FULL SCREEN IMAGE VIEWER ── */}
      <Modal visible={imageModal !== null} animationType="fade" transparent onRequestClose={() => setImageModal(null)}>
        <View style={s.imgViewerOverlay}>
          <TouchableOpacity style={s.imgViewerClose} onPress={() => setImageModal(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {imageModal && (
            <Image
              source={{ uri: imageModal }}
              style={s.imgViewerImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ─── Note card styles ─────────────────────────────────────────────────────────
const nc = StyleSheet.create({
  card:       { flex: 1, borderWidth: 0.5, borderRadius: 16, overflow: "hidden", margin: 5 },
  cardImg:    { width: "100%", height: 120 },
  cardBody:   { padding: 12 },
  cardTitle:  { fontSize: 14, fontWeight: "600", marginBottom: 5, lineHeight: 20 },
  cardDesc:   { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTime:   { fontSize: 11 },
  imgCount:   { flexDirection: "row", alignItems: "center", gap: 3 },
  imgCountTxt:{ fontSize: 11 },
});

// ─── Main styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:            { flex: 1, paddingTop: 16 },
  loader:            { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt:         { fontSize: 14 },
  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 14 },
  pageTitle:         { fontSize: 26, fontWeight: "700" },
  pageSub:           { fontSize: 13, marginTop: 2 },
  addBtn:            { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", elevation: 3, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  searchWrap:        { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 14, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:       { flex: 1, fontSize: 14, padding: 0 },
  row:               { justifyContent: "space-between", paddingHorizontal: 11 },
  listContent:       { paddingBottom: 40 },
  empty:             { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle:        { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySub:          { fontSize: 13, textAlign: "center", lineHeight: 20 },
  modalOuter:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet:        { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: "92%" },
  modalHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  modalTitle:        { fontSize: 20, fontWeight: "700" },
  viewSheet:         { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, flex: 0.95, maxHeight: "95%" },
  viewHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  viewHeaderBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  viewTitle:         { fontSize: 24, fontWeight: "700", lineHeight: 32, marginBottom: 6 },
  viewTime:          { fontSize: 12, marginBottom: 16 },
  viewDesc:          { fontSize: 15, lineHeight: 24 },
  viewDescEmpty:     { fontSize: 14, fontStyle: "italic" },
  fieldLbl:          { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input:             { borderWidth: 0.5, borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 14 },
  textArea:          { minHeight: 140, textAlignVertical: "top" },
  colorSwatch:       { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  colorSwatchActive: { borderWidth: 3, elevation: 3 },
  imgBtnRow:         { flexDirection: "row", gap: 12, marginBottom: 16 },
  imgBtn:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 0.5, borderRadius: 12, paddingVertical: 13 },
  imgBtnTxt:         { fontSize: 14, fontWeight: "500" },
  imgThumbWrap:      { position: "relative" },
  imgThumb:          { width: 90, height: 90, borderRadius: 10 },
  imgRemoveBtn:      { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 12 },
  imgGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgGridItem:       { position: "relative", width: (SCREEN_WIDTH - 60) / 2, height: (SCREEN_WIDTH - 60) / 2 },
  imgGridImg:        { width: "100%", height: "100%", borderRadius: 12 },
  saveBtn:           { borderRadius: 14, padding: 15, alignItems: "center", marginTop: 4, marginBottom: 10 },
  saveBtnTxt:        { color: "#fff", fontSize: 15, fontWeight: "600" },
  imgViewerOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  imgViewerClose:    { position: "absolute", top: Platform.OS === "ios" ? 56 : 36, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  imgViewerImg:      { width: SCREEN_WIDTH, height: "80%" },
});