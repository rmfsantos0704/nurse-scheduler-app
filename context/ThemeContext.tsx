import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorScheme = "pink" | "blue" | "purple" | "teal" | "green";

export type ThemeMode = "light" | "dark";

type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  card: string;
  cardBorder: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  tabBar: string;
  tabBarInactive: string;
};

const SCHEMES: Record<ColorScheme, { light: ThemeColors; dark: ThemeColors }> = {
  pink: {
    light: {
      primary: "#D4537E", primaryDark: "#72243E", primaryLight: "#FFE4EC",
      card: "#fff", cardBorder: "#F4C0D1", background: "#FFF5F8",
      textPrimary: "#72243E", textSecondary: "#C97C95",
      tabBar: "#FFE4EC", tabBarInactive: "#C97C95",
    },
    dark: {
      primary: "#ED93B1", primaryDark: "#F4C0D1", primaryLight: "#3A1825",
      card: "#2A1420", cardBorder: "#5A2840", background: "#1A0D14",
      textPrimary: "#F4C0D1", textSecondary: "#C97C95",
      tabBar: "#2A1420", tabBarInactive: "#7A4A60",
    },
  },
  blue: {
    light: {
      primary: "#378ADD", primaryDark: "#0C447C", primaryLight: "#E6F1FB",
      card: "#fff", cardBorder: "#B5D4F4", background: "#F0F7FF",
      textPrimary: "#0C447C", textSecondary: "#5A8FC2",
      tabBar: "#E6F1FB", tabBarInactive: "#5A8FC2",
    },
    dark: {
      primary: "#85B7EB", primaryDark: "#B5D4F4", primaryLight: "#0A1E35",
      card: "#0E2440", cardBorder: "#1E4A7A", background: "#071629",
      textPrimary: "#B5D4F4", textSecondary: "#5A8FC2",
      tabBar: "#0E2440", tabBarInactive: "#2A5A8C",
    },
  },
  purple: {
    light: {
      primary: "#7F77DD", primaryDark: "#3C3489", primaryLight: "#EEEDFE",
      card: "#fff", cardBorder: "#CECBF6", background: "#F5F4FF",
      textPrimary: "#3C3489", textSecondary: "#7F77DD",
      tabBar: "#EEEDFE", tabBarInactive: "#AFA9EC",
    },
    dark: {
      primary: "#AFA9EC", primaryDark: "#CECBF6", primaryLight: "#1A1835",
      card: "#201E40", cardBorder: "#3C3489", background: "#12102A",
      textPrimary: "#CECBF6", textSecondary: "#7F77DD",
      tabBar: "#201E40", tabBarInactive: "#4A4880",
    },
  },
  teal: {
    light: {
      primary: "#1D9E75", primaryDark: "#085041", primaryLight: "#E1F5EE",
      card: "#fff", cardBorder: "#9FE1CB", background: "#F0FBF7",
      textPrimary: "#085041", textSecondary: "#1D9E75",
      tabBar: "#E1F5EE", tabBarInactive: "#5DCAA5",
    },
    dark: {
      primary: "#5DCAA5", primaryDark: "#9FE1CB", primaryLight: "#051F18",
      card: "#0A2820", cardBorder: "#0F6E56", background: "#030F0C",
      textPrimary: "#9FE1CB", textSecondary: "#1D9E75",
      tabBar: "#0A2820", tabBarInactive: "#0F5A44",
    },
  },
  green: {
    light: {
      primary: "#639922", primaryDark: "#27500A", primaryLight: "#EAF3DE",
      card: "#fff", cardBorder: "#C0DD97", background: "#F4FAE8",
      textPrimary: "#27500A", textSecondary: "#639922",
      tabBar: "#EAF3DE", tabBarInactive: "#97C459",
    },
    dark: {
      primary: "#97C459", primaryDark: "#C0DD97", primaryLight: "#0E1F05",
      card: "#142808", cardBorder: "#3B6D11", background: "#081003",
      textPrimary: "#C0DD97", textSecondary: "#639922",
      tabBar: "#142808", tabBarInactive: "#2A5010",
    },
  },
};

type ThemeContextType = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  toggleMode: () => void;
  setScheme: (s: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [scheme, setSchemeState] = useState<ColorScheme>("pink");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Set initialized immediately with defaults, then load persisted values
    setIsInitialized(true);
    AsyncStorage.multiGet(["themeMode", "themeScheme"]).then(pairs => {
      const m = pairs[0][1] as ThemeMode | null;
      const sc = pairs[1][1] as ColorScheme | null;
      if (m) setMode(m);
      if (sc) setSchemeState(sc);
    }).catch(() => {
      // If AsyncStorage fails, we already have defaults
    });
  }, []);

  const toggleMode = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    AsyncStorage.setItem("themeMode", next);
  };

  const setScheme = (s: ColorScheme) => {
    setSchemeState(s);
    AsyncStorage.setItem("themeScheme", s);
  };

  const colors = SCHEMES[scheme][mode];

  return (
    <ThemeContext.Provider value={{ mode, scheme, colors, toggleMode, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};