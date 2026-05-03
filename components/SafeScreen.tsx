import { View, StyleSheet, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

type Props = {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  style?: any;
};

export function SafeScreen({ children, edges = ["top", "bottom"], style }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
        edges.includes("top")    && { paddingTop:    insets.top    || (Platform.OS === "android" ? StatusBar.currentHeight ?? 14 : 0) },
        edges.includes("bottom") && { paddingBottom: insets.bottom || (Platform.OS === "android" ? 15 : 0) },
        edges.includes("left")   && { paddingLeft:   insets.left   },
        edges.includes("right")  && { paddingRight:  insets.right  },
        style,
      ]}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
        translucent={false}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});