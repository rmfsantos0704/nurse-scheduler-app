import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
  Platform, KeyboardAvoidingView, Dimensions,
  SafeAreaView,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import { useTheme } from "../context/ThemeContext";
import { noteService } from "../services/noteService";

const { width: W } = Dimensions.get("window");

// ─── Undo/Redo stack ─────────────────────────────────────────────────────────
function makeHistory<T>(initial: T) {
  const stack: T[] = [initial];
  let cursor = 0;

  return {
    push(val: T) {
      stack.splice(cursor + 1);
      stack.push(val);
      if (stack.length > 60) stack.shift();
      else cursor++;
    },
    undo(): T | null {
      if (cursor <= 0) return null;
      cursor--;
      return stack[cursor];
    },
    redo(): T | null {
      if (cursor >= stack.length - 1) return null;
      cursor++;
      return stack[cursor];
    },
    canUndo: () => cursor > 0,
    canRedo: () => cursor < stack.length - 1,
  };
}

export default function NoteEditor() {
  const { colors, mode } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const isNew  = !params.id || params.id === "new";

  const editorRef = useRef<RichEditor>(null);
  const history   = useRef(makeHistory(""));

  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [images,  setImages]  = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(true);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing note ────────────────────────────────────────────────
  useEffect(() => {
    if (!isNew && params.id) {
      noteService.getById(params.id).then(note => {
        if (note) {
          setTitle(note.title ?? "");
          setImages(note.images ?? []);
          // content is HTML — set after editor mounts
          setContent(note.content ?? "");
          history.current = makeHistory(note.content ?? "");
        }
        setLoading(false);
      });
    }
  }, [params.id]);

  // ── Inject HTML after editor is ready ────────────────────────────────
  const onEditorReady = () => {
    if (content) editorRef.current?.setContentHTML(content);
  };

  // ── Track changes for undo/save ───────────────────────────────────────
  const onContentChange = (html: string) => {
    setContent(html);
    setSaved(false);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      history.current.push(html);
    }, 400);
  };

  const handleUndo = () => {
    const prev = history.current.undo();
    if (prev !== null) {
      editorRef.current?.setContentHTML(prev);
      setContent(prev);
      setSaved(false);
    }
  };

  const handleRedo = () => {
    const next = history.current.redo();
    if (next !== null) {
      editorRef.current?.setContentHTML(next);
      setContent(next);
      setSaved(false);
    }
  };

  // ── Images ────────────────────────────────────────────────────────────
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
      setImages(prev => [...prev, ...uris]);
      // Insert images into editor HTML as well
      uris.forEach(uri => {
        editorRef.current?.insertImage(uri);
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImages(prev => [...prev, uri]);
      editorRef.current?.insertImage(uri);
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a title.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title:      title.trim(),
        content,
        images,
        formatting: [],
      };
      if (isNew) {
        await noteService.create(body);
      } else if (params.id) {
        await noteService.update(params.id, body);
      }
      setSaved(true);
      router.back();
    } catch {
      Alert.alert("Error", "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (!saved && (title.trim() || content.trim())) {
      Alert.alert("Unsaved changes", "Save before leaving?", [
        { text: "Discard",  style: "destructive", onPress: () => router.back() },
        { text: "Save",     onPress: handleSave },
        { text: "Cancel",   style: "cancel" },
      ]);
    } else {
      router.back();
    }
  };

  // ── Theme colours passed into the WebView ──────────────────────────────
  const editorBg   = colors.background;
  const editorText = colors.textPrimary;

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
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
          onPress={handleSave}
          disabled={saving}
          style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnTxt}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {/* Title field */}
          <View style={[s.titleWrap, { borderBottomColor: colors.cardBorder }]}>
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

          {/* Rich editor */}
          <RichEditor
            ref={editorRef}
            style={s.editor}
            placeholder="Start writing your note..."
            initialContentHTML=""
            editorStyle={{
              backgroundColor:  editorBg,
              color:            editorText,
              placeholderColor: colors.textSecondary,
              caretColor:       colors.primary,
              contentCSSText:   `
                font-family: -apple-system, sans-serif;
                font-size: 16px;
                line-height: 1.7;
                padding: 0 20px 20px 20px;
              `,
            }}
            onChange={onContentChange}
            onEditorReady={onEditorReady}
            useContainer={false}
            pasteAsPlainText={false}
            autoCorrect
            initialFocus={isNew}
          />

          {/* Standalone images (outside editor) */}
          {images.length > 0 && (
            <View style={[s.imgSection, { borderTopColor: colors.cardBorder }]}>
              <Text style={[s.imgLbl, { color: colors.textSecondary }]}>
                Attached photos ({images.length})
              </Text>
              <View style={s.imgGrid}>
                {images.map((uri, idx) => (
                  <View key={idx} style={s.imgWrap}>
                    <Image source={{ uri }} style={s.img} resizeMode="cover" />
                    <TouchableOpacity style={s.imgDel} onPress={() => removeImage(idx)}>
                      <Ionicons name="close-circle" size={22} color="#E24B4A" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── TOOLBAR ── */}
        <View style={[s.toolbarWrap, {
          backgroundColor: colors.card,
          borderTopColor:  colors.cardBorder,
        }]}>
          {/* Undo / Redo row */}
          <View style={[s.undoRow, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={handleUndo}
              style={[s.undoBtn, !history.current.canUndo() && s.dimmed]}
              disabled={!history.current.canUndo()}
            >
              <Ionicons
                name="arrow-undo-outline"
                size={20}
                color={history.current.canUndo() ? colors.textPrimary : colors.textSecondary}
              />
              <Text style={[s.undoBtnTxt, { color: history.current.canUndo() ? colors.textPrimary : colors.textSecondary }]}>
                Undo
              </Text>
            </TouchableOpacity>

            <View style={[s.undoDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              onPress={handleRedo}
              style={[s.undoBtn, !history.current.canRedo() && s.dimmed]}
              disabled={!history.current.canRedo()}
            >
              <Text style={[s.undoBtnTxt, { color: history.current.canRedo() ? colors.textPrimary : colors.textSecondary }]}>
                Redo
              </Text>
              <Ionicons
                name="arrow-redo-outline"
                size={20}
                color={history.current.canRedo() ? colors.textPrimary : colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Camera & gallery */}
            <TouchableOpacity onPress={takePhoto} style={s.mediaBtn}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={s.mediaBtn}>
              <Ionicons name="image-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Pell formatting toolbar */}
          <RichToolbar
            editor={editorRef}
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
              [actions.heading1]:      ({ tintColor }: any) => <Text style={[s.customIcon, { color: tintColor }]}>H1</Text>,
              [actions.heading2]:      ({ tintColor }: any) => <Text style={[s.customIcon, { color: tintColor }]}>H2</Text>,
              [actions.blockquote]:    ({ tintColor }: any) => <Text style={[s.customIcon, { color: tintColor }]}>"</Text>,
              [actions.code]:          ({ tintColor }: any) => <Text style={[s.customIcon, { color: tintColor }]}>{`</>`}</Text>,
              [actions.removeFormat]:  ({ tintColor }: any) => <Text style={[s.customIcon, { color: tintColor }]}>Tx</Text>,
              [actions.indent]:        ({ tintColor }: any) => <Ionicons name="arrow-forward-outline"  size={18} color={tintColor} />,
              [actions.outdent]:       ({ tintColor }: any) => <Ionicons name="arrow-back-outline"     size={18} color={tintColor} />,
            }}
            style={[s.richToolbar, { backgroundColor: colors.card }]}
            flatContainerStyle={{ paddingHorizontal: 6 }}
            iconTint={colors.textPrimary}
            selectedIconTint={colors.primary}
            selectedButtonStyle={{ backgroundColor: colors.primaryLight, borderRadius: 8 }}
            disabledIconTint={colors.textSecondary}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Re-import TextInput that we need
import { TextInput } from "react-native";

const s = StyleSheet.create({
  root:         { flex: 1 },
  loader:       { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 0.5, gap: 8 },
  iconBtn:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topMid:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  topLabel:     { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  savedPill:    { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  savedTxt:     { fontSize: 11, fontWeight: "500" },
  saveBtn:      { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnTxt:   { color: "#fff", fontSize: 14, fontWeight: "600" },
  titleWrap:    { borderBottomWidth: 0.5, paddingHorizontal: 20, paddingVertical: 14 },
  titleInput:   { fontSize: 24, fontWeight: "700" },
  editor:       { minHeight: 320, paddingTop: 4 },
  imgSection:   { borderTopWidth: 0.5, marginTop: 8, padding: 20 },
  imgLbl:       { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  imgGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgWrap:      { position: "relative", width: (W - 60) / 2, height: (W - 60) / 2 },
  img:          { width: "100%", height: "100%", borderRadius: 12 },
  imgDel:       { position: "absolute", top: -8, right: -8, backgroundColor: "#fff", borderRadius: 12 },
  toolbarWrap:  { borderTopWidth: 0.5 },
  undoRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 0.5, gap: 4 },
  undoBtn:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  undoBtnTxt:   { fontSize: 13, fontWeight: "500" },
  undoDivider:  { width: 1, height: 20 },
  dimmed:       { opacity: 0.35 },
  mediaBtn:     { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  richToolbar:  { height: 44 },
  customIcon:   { fontSize: 14, fontWeight: "700" },
});