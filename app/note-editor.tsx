import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
  Platform, TextInput, Image, Dimensions,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { RichEditor, RichToolbar, actions } from "react-native-pell-rich-editor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { noteService } from "../services/noteService";

const { width: W } = Dimensions.get("window");

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

export default function NoteEditor() {
  const { colors } = useTheme();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ id?: string }>();
  const isNew   = !params.id || params.id === "new";

  const editorRef = useRef<RichEditor>(null);
  const history   = useRef(makeHistory(""));
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [images,  setImages]  = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(true);

  useEffect(() => {
    if (!isNew && params.id) {
      noteService.getById(params.id).then(note => {
        if (note) {
          setTitle(note.title ?? "");
          setContent(note.content ?? "");
          setImages(note.images ?? []);
          history.current = makeHistory(note.content ?? "");
        }
        setLoading(false);
      });
    }
  }, [params.id]);

  const onEditorReady = () => {
    if (content) editorRef.current?.setContentHTML(content);
  };

  const onContentChange = (html: string) => {
    setContent(html);
    setSaved(false);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => history.current.push(html), 400);
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
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
      setSaved(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
      setSaved(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setSaved(false);
  };

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
  const toolbarTotalH = UNDO_ROW_H + FMT_ROW_H + bottomInset;

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loadingTxt, { color: colors.textSecondary }]}>Loading note...</Text>
      </View>
    );
  }

  return (
    /*
     * Pure flex column. No absolute positioning anywhere.
     *
     * [spacer]          fixed: topInset px
     * [topbar]          fixed: 52px
     * [title]           fixed: 56px
     * [ScrollView]      flex: 1  ← grows/shrinks, never pushes toolbar
     * [toolbar]         fixed: UNDO_ROW_H + FMT_ROW_H + bottomInset px
     *
     * Toolbar height is pure arithmetic — native layout never measures it.
     * Images grow ScrollView content, not its size, so toolbar never moves.
     */
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* Safe top spacer */}
      <View style={{ height: topInset, backgroundColor: colors.background }} />

      {/* ── TOP BAR ── */}
      <View style={[s.topBar, {
        borderBottomColor: colors.cardBorder,
        backgroundColor:   colors.background,
      }]}>
        <TouchableOpacity onPress={handleBack} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={s.topMid}>
          <Text style={[s.topLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {title || (isNew ? "New note" : "Edit note")}
          </Text>
          <View style={[s.savedPill, {
            backgroundColor: saved ? "#EAF3DE" : colors.primaryLight + "99",
          }]}>
            <Text style={[s.savedTxt, { color: saved ? "#27500A" : colors.primary }]}>
              {saved ? "Saved" : "Editing"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave} disabled={saving}
          style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnTxt}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* ── TITLE ── */}
      <View style={[s.titleWrap, {
        borderBottomColor: colors.cardBorder,
        backgroundColor:   colors.background,
      }]}>
        <TextInput
          style={[s.titleInput, { color: colors.textPrimary }]}
          placeholder="Note title"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={v => { setTitle(v); setSaved(false); }}
          returnKeyType="next"
          maxLength={120}
          onSubmitEditing={() => editorRef.current?.focusContentEditor()}
        />
      </View>

      {/* ── SCROLL AREA — flex:1 — the only thing that grows/shrinks ── */}
      <ScrollView
        style={[s.editorScroll, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.editorContent}
      >
        <RichEditor
          ref={editorRef}
          style={s.editor}
          placeholder="Start writing your note..."
          initialContentHTML=""
          editorStyle={{
            backgroundColor:  colors.background,
            color:            colors.textPrimary,
            placeholderColor: colors.textSecondary,
            caretColor:       colors.primary,
            contentCSSText: `
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 16px;
              line-height: 1.75;
              padding: 16px 20px 20px 20px;
              word-break: break-word;
            `,
          }}
          onChange={onContentChange}
          onEditorReady={onEditorReady}
          pasteAsPlainText={false}
          scrollEnabled={false}
          autoCorrect
          initialFocus={isNew}
        />

        {/* Native images — never in WebView */}
        {images.length > 0 && (
          <View style={[s.imgSection, { borderTopColor: colors.cardBorder }]}>
            <Text style={[s.imgSectionLbl, { color: colors.textSecondary }]}>
              Photos ({images.length})
            </Text>
            <View style={s.imgGrid}>
              {images.map((uri, idx) => (
                <View key={`img-${idx}`} style={s.imgWrap}>
                  <Image source={{ uri }} style={s.img} resizeMode="cover" />
                  <TouchableOpacity
                    style={[s.imgDel, { backgroundColor: colors.background }]}
                    onPress={() => removeImage(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color="#E24B4A" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── TOOLBAR — hardcoded height, never measured, never shifts ── */}
      <View style={[s.toolbar, {
        height:          toolbarTotalH,
        backgroundColor: colors.card,
        borderTopColor:  colors.cardBorder,
        paddingBottom:   bottomInset,
      }]}>

        <View style={[s.undoRow, {
          height:            UNDO_ROW_H,
          borderBottomColor: colors.cardBorder,
        }]}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={!history.current.canUndo()}
            style={[s.undoBtn, !history.current.canUndo() && s.dimmed]}
          >
            <Ionicons
              name="arrow-undo-outline" size={19}
              color={history.current.canUndo() ? colors.textPrimary : colors.textSecondary}
            />
            <Text style={[s.undoBtnTxt, {
              color: history.current.canUndo() ? colors.textPrimary : colors.textSecondary,
            }]}>Undo</Text>
          </TouchableOpacity>

          <View style={[s.divider, { backgroundColor: colors.cardBorder }]} />

          <TouchableOpacity
            onPress={handleRedo}
            disabled={!history.current.canRedo()}
            style={[s.undoBtn, !history.current.canRedo() && s.dimmed]}
          >
            <Text style={[s.undoBtnTxt, {
              color: history.current.canRedo() ? colors.textPrimary : colors.textSecondary,
            }]}>Redo</Text>
            <Ionicons
              name="arrow-redo-outline" size={19}
              color={history.current.canRedo() ? colors.textPrimary : colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity onPress={takePhoto} style={s.mediaBtn}>
            <Ionicons name="camera-outline" size={21} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={s.mediaBtn}>
            <Ionicons name="image-outline" size={21} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <RichToolbar
          editor={editorRef}
          style={[s.fmtToolbar, { backgroundColor: colors.card, height: FMT_ROW_H }]}
          flatContainerStyle={{ paddingHorizontal: 6 }}
          iconTint={colors.textPrimary}
          selectedIconTint={colors.primary}
          selectedButtonStyle={{ backgroundColor: colors.primaryLight, borderRadius: 8 }}
          disabledIconTint={colors.textSecondary}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.setStrikethrough,
            actions.heading1,
            actions.heading2,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.blockquote,
            actions.indent,
            actions.outdent,
            actions.alignLeft,
            actions.alignCenter,
            actions.alignRight,
            actions.code,
            actions.removeFormat,
          ]}
          iconMap={{
            [actions.heading1]:     ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>H1</Text>,
            [actions.heading2]:     ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>H2</Text>,
            [actions.blockquote]:   ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>"</Text>,
            [actions.code]:         ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>{`</>`}</Text>,
            [actions.removeFormat]: ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>Tx</Text>,
            [actions.indent]:       ({ tintColor }: any) => <Ionicons name="arrow-forward-outline" size={18} color={tintColor} />,
            [actions.outdent]:      ({ tintColor }: any) => <Ionicons name="arrow-back-outline" size={18} color={tintColor} />,
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  loader:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt:    { fontSize: 14 },

  topBar:        {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  iconBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topMid:        { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  topLabel:      { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  savedPill:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  savedTxt:      { fontSize: 11, fontWeight: "500" },
  saveBtn:       { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnTxt:    { color: "#fff", fontSize: 14, fontWeight: "600" },

  titleWrap:     {
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  titleInput:    { fontSize: 22, fontWeight: "700" },

  editorScroll:  { flex: 1 },          // ← the only flex:1 in the tree
  editorContent: { paddingBottom: 20 },
  editor:        { minHeight: 260 },

  imgSection:    { borderTopWidth: 0.5, marginTop: 16, paddingHorizontal: 20, paddingTop: 16 },
  imgSectionLbl: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  imgGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgWrap:       { position: "relative", width: (W - 60) / 2, height: (W - 60) / 2 },
  img:           { width: "100%", height: "100%", borderRadius: 12 },
  imgDel:        { position: "absolute", top: -8, right: -8, borderRadius: 12 },

  toolbar:       { borderTopWidth: 0.5, overflow: "hidden" },
  undoRow:       {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 2,
    borderBottomWidth: 0.5,
  },
  undoBtn:       {
    flexDirection: "row", alignItems: "center",
    gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  undoBtnTxt:    { fontSize: 13, fontWeight: "500" },
  divider:       { width: 1, height: 20, marginHorizontal: 4 },
  dimmed:        { opacity: 0.3 },
  mediaBtn:      { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fmtToolbar:    {},
  ico:           { fontSize: 14, fontWeight: "700" },
});