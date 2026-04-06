/**
 * Nursing Scheduler App Theme (Light Pink UI)
 */

import { Platform } from "react-native";

const pinkPrimary = "#FF6FA1";
const pinkSoft = "#FFE4EC";
const pinkDark = "#C97C95";

export const Colors = {
  light: {
    text: "#2B2B2B",
    background: "#FFF5F8",

    // main brand color
    tint: pinkPrimary,

    // UI elements
    card: pinkSoft,
    border: "#F3C1D4",

    icon: pinkDark,
    tabIconDefault: pinkDark,
    tabIconSelected: pinkPrimary,

    success: "#4CAF50",
    warning: "#FFB300",
    error: "#E53935",
  },

  dark: {
    text: "#F5F5F5",
    background: "#1A1216",

    tint: pinkPrimary,

    card: "#2A1B22",
    border: "#3A242D",

    icon: "#D1A3B3",
    tabIconDefault: "#D1A3B3",
    tabIconSelected: pinkPrimary,

    success: "#4CAF50",
    warning: "#FFB300",
    error: "#EF5350",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});