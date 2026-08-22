import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
  Platform, TextInput, Image, Dimensions,
  Modal, Animated,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { RichEditor, RichToolbar, actions } from "react-native-pell-rich-editor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { noteService } from "../services/noteService";

const { width: W, height: H } = Dimensions.get("window");

function makeHistory<T>(initial: T) {
  const stack: T[] = [initial];
  let cursor = 0;
  return {
    push(val: T) {
      stack.splice(cursor + 1);
      stack.push(val);
      if (stack.length > 60) stack.shift(); else cursor++;
    },
    undo(): T | null { if (cursor <= 0) return null; return stack[--cursor]; },
    redo(): T | null { if (cursor >= stack.length - 1) return null; return stack[++cursor]; },
    canUndo: () => cursor > 0,
    canRedo: () => cursor < stack.length - 1,
  };
}

const UNDO_ROW_H = 44;
const FMT_ROW_H  = 44;

// Strip HTML tags to get plain text for find
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

// Count how many times needle appears in haystack (case-insensitive)
function countMatches(text: string, needle: string): number {
  if (!needle.trim()) return 0;
  try {
    return (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? []).length;
  } catch { return 0; }
}

export default function NoteEditor() {
  const { colors } = useTheme();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ id?: string }>();
  const isNew   = !params.id || params.id === "new";

  const editorRef = useRef<RichEditor>(null);
  const history   = useRef(makeHistory(""));
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title,         setTitle]         = useState("");
  const [content,       setContent]       = useState("");
  const [images,        setImages]        = useState<string[]>([]);
  const [loading,       setLoading]       = useState(!isNew);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ── Find in note ──────────────────────────────────────────────────────
  const [findOpen,   setFindOpen]   = useState(false);
  const [findQuery,  setFindQuery]  = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const findInputRef = useRef<TextInput>(null);
  const findBarAnim  = useRef(new Animated.Value(0)).current;

  const openFind = () => {
    setFindOpen(true);
    Animated.spring(findBarAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
    setTimeout(() => findInputRef.current?.focus(), 150);
  };

  const closeFind = () => {
    Animated.timing(findBarAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setFindOpen(false);
      setFindQuery("");
      setMatchCount(0);
      // Clear highlights in the WebView
      editorRef.current?.sendAction("highlight", "result", null, "");
    });
  };

  const handleFind = (q: string) => {
    setFindQuery(q);
    const plain = stripHtml(content);
    const count = countMatches(plain, q);
    setMatchCount(count);

    // Use the RichEditor's built-in find via postMessage to the WebView
    // This highlights all matches inside the editor WebView
    if (editorRef.current) {
      if (q.trim()) {
        // Inject JS into the WebView to highlight matches
        const escaped = q.replace(/'/g, "\\'").replace(/"/g, '\\"');
        editorRef.current.commandDOM(`
          (function() {
            // Remove previous highlights
            document.querySelectorAll('mark.snowed-find').forEach(m => {
              const parent = m.parentNode;
              parent.replaceChild(document.createTextNode(m.textContent), m);
              parent.normalize();
            });
            if (!${JSON.stringify(q)}) return;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            const re = new RegExp(${JSON.stringify(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))}, 'gi');
            nodes.forEach(node => {
              const text = node.textContent;
              if (!re.test(text)) return;
              re.lastIndex = 0;
              const frag = document.createDocumentFragment();
              let last = 0, m;
              while ((m = re.exec(text)) !== null) {
                frag.appendChild(document.createTextNode(text.slice(last, m.index)));
                const mark = document.createElement('mark');
                mark.className = 'snowed-find';
                mark.style.backgroundColor = '#FFD700';
                mark.style.color = '#000';
                mark.style.borderRadius = '2px';
                mark.textContent = m[0];
                frag.appendChild(mark);
                last = m.index + m[0].length;
              }
              frag.appendChild(document.createTextNode(text.slice(last)));
              node.parentNode.replaceChild(frag, node);
            });
          })();
        `);
      } else {
        // Clear highlights
        editorRef.current.commandDOM(`
          document.querySelectorAll('mark.snowed-find').forEach(m => {
            const parent = m.parentNode;
            parent.replaceChild(document.createTextNode(m.textContent), m);
            parent.normalize();
          });
        `);
      }
    }
  };

  useEffect(() => {
    if (!isNew && params.id) {
      setLoading(true);
      noteService.getById(params.id).then(note => {
        if (note) {
          setTitle(note.title ?? "");
          const savedContent = note.content ?? "";
          setContent(savedContent);
          setImages(note.images ?? []);
          history.current = makeHistory(savedContent);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [params.id, isNew]);

  const onContentChange = (html: string) => {
    setContent(html);
    setSaved(false);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => history.current.push(html), 400);
    // Update match count when content changes while find is open
    if (findOpen && findQuery) {
      setMatchCount(countMatches(stripHtml(html), findQuery));
    }
  };

  const handleUndo = () => {
    const prev = history.current.undo();
    if (prev !== null) { editorRef.current?.setContentHTML(prev); setContent(prev); setSaved(false); }
  };

  const handleRedo = () => {
    const next = history.current.redo();
    if (next !== null) { editorRef.current?.setContentHTML(next); setContent(next); setSaved(false); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, quality: 0.7,
    });
    if (!result.canceled) { setImages(prev => [...prev, ...result.assets.map(a => a.uri)]); setSaved(false); }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) { setImages(prev => [...prev, result.assets[0].uri]); setSaved(false); }
  };

  const removeImage = (idx: number) => { setImages(prev => prev.filter((_, i) => i !== idx)); setSaved(false); };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a title."); return; }
    setSaving(true);
    try {
      const body = { title: title.trim(), content, images, formatting: [] };
      if (isNew) await noteService.create(body);
      else if (params.id) await noteService.update(params.id, body);
      setSaved(true);
      router.back();
    } catch { Alert.alert("Error", "Could not save note."); }
    finally { setSaving(false); }
  };

  const handleBack = () => {
    if (findOpen) { closeFind(); return; }
    if (!saved && (title.trim() || content.trim() || images.length > 0)) {
      Alert.alert("Unsaved changes", "Save before leaving?", [
        { text: "Discard", style: "destructive", onPress: () => router.back() },
        { text: "Save",    onPress: handleSave },
        { text: "Cancel",  style: "cancel" },
      ]);
    } else { router.back(); }
  };

  const topInset    = insets.top    > 0 ? insets.top    : (Platform.OS === "android" ? 28 : 44);
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 0);

  if (loading) return (
    <View style={[s.loader, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[s.loadingTxt, { color: colors.textSecondary }]}>Loading note...</Text>
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset, backgroundColor: colors.background }} />

      {/* ── NAV BAR ── */}
      <View style={[s.topBar, { borderBottomColor: colors.cardBorder, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Find button */}
        <TouchableOpacity
          onPress={findOpen ? closeFind : openFind}
          style={[s.findToggleBtn, {
            backgroundColor: findOpen ? colors.primaryLight : "transparent",
            borderColor: findOpen ? colors.primary : "transparent",
          }]}
        >
          <Ionicons
            name={findOpen ? "close" : "search-outline"}
            size={20}
            color={findOpen ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          disabled={saving}
        >
          <Text style={s.saveBtnTxt}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── FIND BAR — slides in below nav bar ── */}
      {findOpen && (
        <Animated.View
          style={[
            s.findBar,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.cardBorder,
              transform: [{
                translateY: findBarAnim.interpolate({
                  inputRange: [0, 1], outputRange: [-48, 0],
                }),
              }],
              opacity: findBarAnim,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            ref={findInputRef}
            style={[s.findInput, { color: colors.textPrimary }]}
            placeholder="Find in note..."
            placeholderTextColor={colors.textSecondary}
            value={findQuery}
            onChangeText={handleFind}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {/* Match count badge */}
          {findQuery.length > 0 && (
            <View style={[s.matchBadge, {
              backgroundColor: matchCount > 0 ? colors.primaryLight : "#FCEBEB",
            }]}>
              <Text style={[s.matchTxt, {
                color: matchCount > 0 ? colors.primary : "#E24B4A",
              }]}>
                {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? "es" : ""}` : "No matches"}
              </Text>
            </View>
          )}
          {findQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => { setFindQuery(""); handleFind(""); findInputRef.current?.focus(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ── TOOLBAR ── */}
      <View style={[s.toolbar, {
        backgroundColor: colors.card,
        borderBottomColor: colors.cardBorder,
        flexDirection: "row",
        alignItems: "center",
      }]}>
        <RichToolbar
          editor={editorRef}
          style={[s.fmtToolbar, { backgroundColor: colors.card, height: FMT_ROW_H, flex: 1 }]}
          iconTint={colors.textPrimary}
          selectedIconTint={colors.primary}
          actions={[
            actions.setBold, actions.setItalic, actions.setUnderline, actions.setStrikethrough,
            actions.heading1, actions.heading2, actions.insertBulletsList, actions.insertOrderedList,
            actions.blockquote, actions.indent, actions.outdent, actions.alignLeft,
            actions.alignCenter, actions.alignRight, actions.code, actions.removeFormat,
          ]}
          iconMap={{
            [actions.heading1]: ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>H1</Text>,
            [actions.heading2]: ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>H2</Text>,
            [actions.code]:     ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>{`</>`}</Text>,
          }}
        />
        <View style={{ flexDirection: "row", paddingHorizontal: 4 }}>
          <View style={{ width: 1, height: 40, backgroundColor: colors.cardBorder }} />
          <View style={s.undoRow}>
            <TouchableOpacity onPress={handleUndo} disabled={!history.current.canUndo()} style={[s.undoBtn, !history.current.canUndo() && s.dimmed]}>
              <Ionicons name="arrow-undo-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRedo} disabled={!history.current.canRedo()} style={[s.undoBtn, !history.current.canRedo() && s.dimmed]}>
              <Ionicons name="arrow-redo-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={takePhoto} style={s.mediaBtn}>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={s.mediaBtn}>
            <Ionicons name="image-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TITLE ── */}
      <View style={[s.titleWrap, { borderBottomColor: colors.cardBorder }]}>
        <TextInput
          style={[s.titleInput, { color: colors.textPrimary }]}
          placeholder="Note title"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={v => { setTitle(v); setSaved(false); }}
          onSubmitEditing={() => editorRef.current?.focusContentEditor()}
        />
      </View>

      {/* ── EDITOR + IMAGES ── */}
      <ScrollView
        style={[s.editorScroll, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.editorContent, { paddingBottom: bottomInset + 20 }]}
        nestedScrollEnabled
      >
        <RichEditor
          key={params.id || "new"}
          ref={editorRef}
          style={s.editor}
          placeholder="Start writing..."
          initialContentHTML={content}
          editorStyle={{
            backgroundColor: colors.background,
            color:           colors.textPrimary,
            contentCSSText:  `font-size: 16px; line-height: 1.75; padding: 16px 20px;`,
          }}
          onChange={onContentChange}
          scrollEnabled={false}
        />

        {images.length > 0 && (
          <View style={[s.imgSection, { borderTopColor: colors.cardBorder }]}>
            <Text style={[s.imgSectionLbl, { color: colors.textSecondary }]}>Photos ({images.length})</Text>
            <View style={s.imgGrid}>
              {images.map((uri, idx) => (
                <View key={`img-${idx}`} style={s.imgWrap}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedImage(uri)} style={s.imgTouch}>
                    <Image source={{ uri }} style={s.img} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.imgDel, { backgroundColor: colors.background }]} onPress={() => removeImage(idx)}>
                    <Ionicons name="close-circle" size={22} color="#E24B4A" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── IMAGE VIEWER ── */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={s.modalRoot}>
          <TouchableOpacity style={s.modalClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={s.modalScroll}
            maximumZoomScale={3} minimumZoomScale={1}
          >
            {selectedImage && <Image source={{ uri: selectedImage }} style={s.fullImg} resizeMode="contain" />}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  loader:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { fontSize: 14 },

  // Nav bar
  topBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    position: "relative",
  },
  centeredTitleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  iconBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  topLabel:  { fontSize: 16, fontWeight: "500", maxWidth: W * 0.5 },
  findToggleBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 6 },
  saveBtn:   { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 70, alignItems: "center", justifyContent: "center" },
  saveBtnTxt:{ color: "#fff", fontSize: 15, fontWeight: "600" },

  // Find bar — slides in below nav bar
  findBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    overflow: "hidden",
  },
  findInput:  { flex: 1, fontSize: 14, padding: 0 },
  matchBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  matchTxt:   { fontSize: 12, fontWeight: "600" },

  // Toolbar
  toolbar:    { borderBottomWidth: 0.5, overflow: "hidden" },
  undoRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 2 },
  undoBtn:    { padding: 6, borderRadius: 6 },
  dimmed:     { opacity: 0.3 },
  mediaBtn:   { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fmtToolbar: {},
  ico:        { fontSize: 14, fontWeight: "700" },

  // Title
  titleWrap:  { height: 56, justifyContent: "center", paddingHorizontal: 20, borderBottomWidth: 0.5 },
  titleInput: { fontSize: 22, fontWeight: "700" },

  // Editor
  editorScroll:  { flex: 1 },
  editorContent: { paddingTop: 10 },
  editor:        { minHeight: 260 },

  // Images
  imgSection:    { borderTopWidth: 0.5, marginTop: 16, paddingHorizontal: 20, paddingTop: 16 },
  imgSectionLbl: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 12 },
  imgGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgWrap:       { position: "relative", width: (W - 60) / 2, height: (W - 60) / 2 },
  imgTouch:      { width: "100%", height: "100%" },
  img:           { width: "100%", height: "100%", borderRadius: 12 },
  imgDel:        { position: "absolute", top: -8, right: -8, borderRadius: 12 },

  // Image viewer
  modalRoot:  { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  modalClose: { position: "absolute", top: Platform.OS === "ios" ? 60 : 20, right: 20, zIndex: 10, padding: 10 },
  modalScroll:{ flex: 1, justifyContent: "center", alignItems: "center" },
  fullImg:    { width: W, height: H * 0.8 },

  // unused legacy keys kept to avoid import errors
  topMid: {}, savedPill: {}, savedTxt: {}, divider: {}, undoBtnTxt: {},
});