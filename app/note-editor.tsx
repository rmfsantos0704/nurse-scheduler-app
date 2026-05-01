import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
  Platform, TextInput, Image, Dimensions,
  Modal
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const topInset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? 28 : 44);
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 0);

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loadingTxt, { color: colors.textSecondary }]}>Loading note...</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset, backgroundColor: colors.background }} />
      
      {/* Nav Bar */}
      <View style={[s.topBar, { borderBottomColor: colors.cardBorder, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={[s.iconBtn, { zIndex: 10 }]}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.centeredTitleContainer} pointerEvents="none">
          <View style={s.topMidCentered}>
            <Text style={[s.topLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {title || (isNew ? "New note" : "Edit note")}
            </Text>
          </View>
        </View>
          <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleSave} style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} disabled={saving}>
          <Text style={s.saveBtnTxt}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>

      {/* Toolbar with Pinned Media Buttons */}
      <View style={[
        s.toolbar, 
        { 
          backgroundColor: colors.card, 
          borderBottomWidth: 0.5, 
          borderBottomColor: colors.cardBorder,
          flexDirection: 'row', 
          alignItems: 'center' 
        }
      ]}>
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
            [actions.code]: ({ tintColor }: any) => <Text style={[s.ico, { color: tintColor }]}>{`</>`}</Text>,
          }}
        />

        {/* Media Buttons */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
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

      {/* Title Input */}
      <View style={[s.titleWrap, { borderBottomColor: colors.cardBorder, backgroundColor: colors.background }]}>
        <TextInput
          style={[s.titleInput, { color: colors.textPrimary }]}
          placeholder="Note title"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={v => { setTitle(v); setSaved(false); }}
          onSubmitEditing={() => editorRef.current?.focusContentEditor()}
        />
      </View>

      <ScrollView
        style={[s.editorScroll, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.editorContent, { paddingBottom: bottomInset + 20 }]}
      >
        <RichEditor
          key={params.id || "new"}
          ref={editorRef}
          style={s.editor}
          placeholder="Start writing..."
          initialContentHTML={content}
          editorStyle={{
            backgroundColor: colors.background,
            color: colors.textPrimary,
            contentCSSText: `font-size: 16px; line-height: 1.75; padding: 16px 20px;`,
          }}
          onChange={onContentChange}
        />

        {/* Image Grid with Viewer Trigger */}
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

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={s.modalRoot}>
          <TouchableOpacity style={s.modalClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={s.modalScroll}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {selectedImage && <Image source={{ uri: selectedImage }} style={s.fullImg} resizeMode="contain" />}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    height: 64, 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    borderBottomWidth: 0.5,
    position: 'relative', 
  },
  centeredTitleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  topMidCentered: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: W * 0.5, 
  },
  root:          { flex: 1 },
  loader:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt:    { fontSize: 14 },

  iconBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: "center", 
    justifyContent: "center",
    marginLeft: -8 
  },
  topMid:        { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  topLabel:      { fontSize: 16, fontWeight: "500", flexShrink: 1 },
  savedPill:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  savedTxt:      { fontSize: 11, fontWeight: "500" },
  saveBtn: { 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 8,
    minWidth: 70, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  titleWrap:     { height: 56, justifyContent: "center", paddingHorizontal: 20, borderBottomWidth: 0.5 },
  titleInput:    { fontSize: 22, fontWeight: "700" },
  editorScroll:  { flex: 1 },
  editorContent: { paddingTop: 10 },
  editor:        { minHeight: 260 },
  imgSection:    { borderTopWidth: 0.5, marginTop: 16, paddingHorizontal: 20, paddingTop: 16 },
  imgSectionLbl: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 12 },
  imgGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgWrap:       { position: "relative", width: (W - 60) / 2, height: (W - 60) / 2 },
  imgTouch:      { width: "100%", height: "100%" },
  img:           { width: "100%", height: "100%", borderRadius: 12 },
  imgDel:        { position: "absolute", top: -8, right: -8, borderRadius: 12 },
  toolbar:       { overflow: "hidden" },
  undoRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 2 },
  undoBtn:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 3, paddingVertical: 7 },
  undoBtnTxt:    { fontSize: 13, fontWeight: "500" },
  divider:       { width: 1, height: 20, marginHorizontal: 4 },
  dimmed:        { opacity: 0.3 },
  mediaBtn:      { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fmtToolbar:    {},
  ico:           { fontSize: 14, fontWeight: "700" },
  modalRoot:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  modalClose:    { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 20, right: 20, zIndex: 10, padding: 10 },
  modalScroll:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullImg:       { width: W, height: H * 0.8 },
});