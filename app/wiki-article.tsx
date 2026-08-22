import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, TextInput,
} from "react-native";
import { WebView } from "react-native-webview";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { noteService } from "../services/noteService";
import { wikiFetch } from "../services/wikiApi";

// Wikipedia Action API works on native clients without the REST API's 403 response.
const WIKI_ARTICLE = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&origin=*&redirects=1&titles=";
const WIKI_RENDERED_ARTICLE = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&origin=*&redirects=1&titles=";

type Section = { title: string; content: string };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanWikiText = (value: string) => value
  .replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\s*/g, "")
  .replace(/[ \t]{2,}/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const cleanArticleHtml = (value: string) => value.replace(/>\s+</g, "><");

const HighlightedText = ({ content, query, textStyle, highlightColor }: {
  content: string;
  query: string;
  textStyle: object;
  highlightColor: string;
}) => {
  if (!query.trim()) return <Text style={textStyle}>{content}</Text>;

  const parts = content.split(new RegExp(`(${escapeRegExp(query.trim())})`, "gi"));
  return (
    <Text style={textStyle}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase()
          ? <Text key={index} style={{ backgroundColor: highlightColor, fontWeight: "700" }}>{part}</Text>
          : part
      )}
    </Text>
  );
};

const parseArticleExtract = (extract: string): { summary: string; sections: Section[] } => {
  const parts = extract.split(/^={2,6}\s*(.*?)\s*={2,6}\s*$/gm);
  const summary = cleanWikiText(parts.shift() ?? "");
  const sections: Section[] = [];

  for (let index = 0; index < parts.length; index += 2) {
    const title = cleanWikiText(parts[index] ?? "");
    const content = cleanWikiText(parts[index + 1] ?? "");
    if (title && content) sections.push({ title, content });
  }

  return { summary, sections };
};

export default function WikiArticle() {
  const { colors } = useTheme();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ pageid: string; title: string }>();
  const topInset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? 28 : 44);

  const [summary,   setSummary]   = useState("");
  const [sections,  setSections]  = useState<Section[]>([]);
  const [articleHtml, setArticleHtml] = useState("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [expanded,  setExpanded]  = useState<Set<number>>(new Set([0]));
  const [searchOpen, setSearchOpen] = useState(false);
  const [articleQuery, setArticleQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => { loadArticle(); }, [params.title]);

  useEffect(() => {
    const query = articleQuery.trim().toLowerCase();
    if (!query) return;
    setExpanded(prev => {
      const next = new Set(prev);
      sections.forEach((section, index) => {
        if (`${section.title} ${section.content}`.toLowerCase().includes(query)) next.add(index);
      });
      return next;
    });
  }, [articleQuery, sections]);

  const articleText = [summary, ...sections.flatMap(section => [section.title, section.content])].join(" ");
  const displayHtml = cleanArticleHtml(articleHtml);
  const matchCount = articleQuery.trim()
    ? articleText.match(new RegExp(escapeRegExp(articleQuery.trim()), "gi"))?.length ?? 0
    : 0;

  const loadArticle = async () => {
    setLoading(true);
    setError("");
    try {
      const [plainData, renderedData] = await Promise.all([
        wikiFetch(`${WIKI_ARTICLE}${encodeURIComponent(params.title)}`),
        wikiFetch(`${WIKI_RENDERED_ARTICLE}${encodeURIComponent(params.title)}`),
      ]);
      const page = Object.values(plainData?.query?.pages ?? {})[0] as
        | { extract?: string; missing?: string }
        | undefined;
      const renderedPage = Object.values(renderedData?.query?.pages ?? {})[0] as
        | { extract?: string }
        | undefined;

      if (!page || page.missing !== undefined || !page.extract) {
        throw new Error("Article not found");
      }

      const article = parseArticleExtract(page.extract);
      setSummary(article.summary);
      setSections(article.sections);
      setArticleHtml((renderedPage?.extract ?? "").replace(/src=["']\/\//g, "src=\"https://"));
      setExpanded(new Set([0]));
    } catch (err: any) {
      console.error("Wikipedia Article Load Error:", err);
      setError(
        err.message?.includes("429")
          ? "Too many requests. Please wait a moment."
          : "Could not load the article. Check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };
  const toggleSection = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const saveToNotes = async () => {
    if (!summary && sections.length === 0) return;
    setSaving(true);
    try {
      // Prefer Wikipedia's rendered HTML so saved formulas keep their markup.
      let content = articleHtml || `<p>${summary}</p>`;
      if (!articleHtml) {
        for (const sec of sections) {
          content += `<h2>${sec.title}</h2><p>${sec.content.replace(/\n/g, "<br/>")}</p>`;
        }
      }
      await noteService.create({
        title:      `Wikipedia: ${params.title}`,
        content,
        images:     [],
        formatting: [],
      });
      setSaved(true);
      Alert.alert("Saved!", `"${params.title}" has been saved to your Notes.`);
    } catch {
      Alert.alert("Error", "Could not save to Notes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset, backgroundColor: colors.background }} />
      <View style={[s.topBar, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.topBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {params.title}
        </Text>
      </View>
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.loadingTxt, { color: colors.textSecondary }]}>Loading article...</Text>
      </View>
    </View>
  );

  if (error) return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset, backgroundColor: colors.background }} />
      <View style={[s.topBar, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={s.center}>
        <Ionicons name="wifi-outline" size={48} color={colors.textSecondary} />
        <Text style={[s.errorTitle, { color: colors.textPrimary }]}>Could not load article</Text>
        <Text style={[s.errorSub, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={loadArticle}>
          <Text style={s.retryTxt}>Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset, backgroundColor: colors.background }} />

      {/* Top bar */}
      <View style={[s.topBar, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.topBarTitle, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
          {params.title}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setSearchOpen(prev => !prev);
            if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
          style={s.iconBtn}
          accessibilityLabel="Search inside article"
        >
          <Ionicons name={searchOpen ? "close" : "search-outline"} size={21} color={colors.textPrimary} />
        </TouchableOpacity>
        {/* Save to Notes */}
        <TouchableOpacity
          onPress={saveToNotes}
          disabled={saving || saved}
          style={[s.saveBtn, {
            backgroundColor: saved ? "#EAF3DE" : colors.primary,
            opacity: saving ? 0.6 : 1,
          }]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Ionicons name={saved ? "checkmark" : "bookmark-outline"} size={15} color={saved ? "#27500A" : "#fff"} />
                <Text style={[s.saveBtnTxt, { color: saved ? "#27500A" : "#fff" }]}>
                  {saved ? "Saved" : "Save to Notes"}
                </Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {searchOpen && (
        <View style={[s.articleSearch, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[s.articleSearchInput, { color: colors.textPrimary }]}
            placeholder="Find in article..."
            placeholderTextColor={colors.textSecondary}
            value={articleQuery}
            onChangeText={setArticleQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
          />
          {articleQuery.length > 0 && (
            <Text style={[s.matchCount, { color: matchCount ? colors.primary : colors.textSecondary }]}>
              {matchCount ? `${matchCount} found` : "Not found"}
            </Text>
          )}
          <TouchableOpacity onPress={() => setArticleQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <WebView
        style={s.webView}
        originWhitelist={["*"]}
        source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
          body { background: ${colors.background}; color: ${colors.textPrimary}; font-family: sans-serif; font-size: 16px; line-height: 1.6; padding: 20px; margin: 0; white-space: normal; }
          h1 { font-size: 28px; line-height: 1.25; margin: 0 0 12px; } h2 { font-size: 21px; margin: 24px 0 8px; }
          p { margin: 0 0 16px; } img, svg { max-width: 100%; height: auto; } .mwe-math-element { display: inline-block; margin: 4px 0; }
          a { color: ${colors.primary}; } mark { background: ${colors.primaryLight}; color: inherit; font-weight: 700; }
        </style></head><body><h1>${params.title}</h1><p><small>From Wikipedia, the free encyclopedia</small></p>${displayHtml}<hr><p><small>Content from Wikipedia under CC BY-SA 4.0</small></p></body></html>` }}
        javaScriptEnabled
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  topBar:       { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topBarTitle:  { fontSize: 15, fontWeight: "600", flex: 1 },
  iconBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  saveBtn:      { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  saveBtnTxt:   { fontSize: 12, fontWeight: "600" },
  articleSearch:{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 0.5 },
  articleSearchInput: { flex: 1, fontSize: 14, paddingVertical: 3 },
  matchCount:   { fontSize: 11, fontWeight: "600" },
  webView:      { flex: 1, backgroundColor: "transparent" },
  scroll:       { flex: 1 },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingTxt:   { fontSize: 14, marginTop: 8 },
  errorTitle:   { fontSize: 18, fontWeight: "600", textAlign: "center" },
  errorSub:     { fontSize: 13, textAlign: "center", lineHeight: 20 },
  retryBtn:     { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryTxt:     { color: "#fff", fontSize: 14, fontWeight: "600" },
  articleTitle: { fontSize: 26, fontWeight: "800", lineHeight: 34, marginBottom: 10 },
  sourceBadge:  { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14 },
  sourceTxt:    { fontSize: 11, fontWeight: "500" },
  summaryBox:   { borderWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 20 },
  summaryText:  { fontSize: 15, lineHeight: 24 },
  tocLabel:     { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  section:      { borderWidth: 0.5, borderRadius: 12, overflow: "hidden", marginBottom: 10 },
  sectionHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  sectionBody:  { padding: 14, paddingTop: 0 },
  sectionText:  { fontSize: 14, lineHeight: 22 },
  footer:       { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 0.5, paddingTop: 16, marginTop: 20 },
  footerTxt:    { fontSize: 11, flex: 1, lineHeight: 16 },
});