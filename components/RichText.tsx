import { Text } from "react-native";

type Props = { content: string; style?: any; numberOfLines?: number };

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function RichText({ content, style, numberOfLines }: Props) {
  if (!content) return null;
  const plain = stripHtml(content);
  if (!plain) return null;
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {plain}
    </Text>
  );
}