import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Platform,
} from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { wikiFetch } from "../../services/wikiApi";

const BUBBLE_CLEARANCE = 100;

type WikiResult = {
  pageid: number;
  title: string;
  snippet: string;
};

const WIKI_SEARCH = "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=";

const POPULAR_TOPICS = [
  "Photosynthesis", "World War II", "Human anatomy",
  "Newton's laws", "Cell biology", "The water cycle",
  "Algebra", "Solar system", "DNA", "Climate change",
  "French Revolution", "Periodic table",
];

export default function Research() {
  const { colors } = useTheme();
  const insets    = useSafeAreaInsets();
  const bottomPad = (insets.bottom > 0 ? insets.bottom : (Platform.OS === "android" ? 16 : 0)) + BUBBLE_CLEARANCE;

  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<WikiResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState("");
  const inputRef = useRef<TextInput>(null);

  const search = async (q: string) => {
    const term = q.trim();
    if (!term || loading) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const url = `${WIKI_SEARCH}${encodeURIComponent(term)}&srlimit=15`;
      const data = await wikiFetch(url);
      if (data?.error) throw new Error(data.error.info ?? "Wikipedia search failed");

      const hits: WikiResult[] = (data?.query?.search ?? []).map((r: any) => ({
        pageid: r.pageid,
        title: r.title,
        snippet: r.snippet.replace(/<[^>]+>/g, ""),
      }));
      setResults(hits);
    } catch (err: any) {
      console.error("Wikipedia Search Error:", err);
      setError(
        err.message?.includes("429")
          ? "Too many requests. Please wait a few seconds and try again."
          : "Could not connect to Wikipedia. Check your internet connection."
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openArticle = (item: WikiResult) => {
    router.push({
      pathname: "/wiki-article",
      params: { pageid: String(item.pageid), title: item.title },
    });
  };

  const clearSearch = () => {
    setQuery(""); setResults([]); setSearched(false); setError("");
    inputRef.current?.focus();
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.cardBorder }]}>
        <View>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Research</Text>
          <Text style={[s.pageSub, { color: colors.textSecondary }]}>
            Wikipedia · Free &amp; open
          </Text>
        </View>
        <View style={[s.wikiBadge, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[s.wikiBadgeTxt, { color: colors.textSecondary }]}>W</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="Search any topic..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.searchBtn, { backgroundColor: colors.primary, opacity: (!query.trim() || loading) ? 0.5 : 1 }]}
          onPress={() => search(query)}
          disabled={loading || !query.trim()}
        >
          <Text style={s.searchBtnTxt}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.loadingTxt, { color: colors.textSecondary }]}>Searching Wikipedia...</Text>
        </View>

      ) : error ? (
        <View style={s.center}>
          <Ionicons name="wifi-outline" size={48} color={colors.textSecondary} />
          <Text style={[s.errorTitle, { color: colors.textPrimary }]}>No connection</Text>
          <Text style={[s.errorSub, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => search(query)}>
            <Text style={s.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>

      ) : !searched ? (
        /* Popular topics grid */
        <FlatList
          key="topics-grid"
          data={POPULAR_TOPICS}
          keyExtractor={t => t}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={[s.topicsWrap, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              Popular study topics
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.topicChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => { setQuery(item); search(item); }}
              activeOpacity={0.75}
            >
              <Ionicons name="book-outline" size={15} color={colors.primary} />
              <Text style={[s.topicTxt, { color: colors.textPrimary }]} numberOfLines={1}>{item}</Text>
            </TouchableOpacity>
          )}
        />

      ) : results.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={[s.errorTitle, { color: colors.textPrimary }]}>No results found</Text>
          <Text style={[s.errorSub, { color: colors.textSecondary }]}>
            Try different keywords or check your spelling.
          </Text>
        </View>

      ) : (
        /* Results */
        <FlatList
          key="search-results"
          data={results}
          keyExtractor={r => String(r.pageid)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => openArticle(item)}
              activeOpacity={0.8}
            >
              <View style={[s.resultAccent, { backgroundColor: colors.primary }]} />
              <View style={s.resultBody}>
                <Text style={[s.resultTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.snippet ? (
                  <Text style={[s.resultSnippet, { color: colors.textSecondary }]} numberOfLines={3}>
                    {item.snippet}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  pageTitle:    { fontSize: 24, fontWeight: "700" },
  pageSub:      { fontSize: 12, marginTop: 2 },
  wikiBadge:    { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  wikiBadgeTxt: { fontSize: 16, fontWeight: "700" },
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, borderWidth: 0.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:  { flex: 1, fontSize: 15, padding: 0 },
  searchBtn:    { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  searchBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingTxt:   { fontSize: 14, marginTop: 8 },
  errorTitle:   { fontSize: 18, fontWeight: "600", textAlign: "center" },
  errorSub:     { fontSize: 13, textAlign: "center", lineHeight: 20 },
  retryBtn:     { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryTxt:     { color: "#fff", fontSize: 14, fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  topicsWrap:   { padding: 16, gap: 10 },
  topicChip:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 0.5, borderRadius: 12, padding: 12 },
  topicTxt:     { fontSize: 13, fontWeight: "500", flex: 1 },
  resultCard:   { flexDirection: "row", alignItems: "center", borderWidth: 0.5, borderRadius: 14, overflow: "hidden", gap: 12 },
  resultAccent: { width: 4, alignSelf: "stretch" },
  resultBody:   { flex: 1, paddingVertical: 12, gap: 5 },
  resultTitle:  { fontSize: 15, fontWeight: "600", lineHeight: 20, paddingRight: 4 },
  resultSnippet:{ fontSize: 12, lineHeight: 18 },
});