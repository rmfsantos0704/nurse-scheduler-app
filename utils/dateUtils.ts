import { TYPE_COLORS, TYPE_BG } from "../constants/scheduleTypes";

export const toTimeString = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const toDateString = (d: Date) =>
  d.toISOString().split("T")[0];

export const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

export const buildDateTime = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const cleaned = timeStr.replace(/\./g, ":").trim();
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return new Date();
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(year, month - 1, day, hours, minutes);
};

export const isPastDateTime = (dateStr: string, timeStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const cleaned = timeStr.replace(/\./g, ":").trim();
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return false;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(y, m - 1, d, hours, minutes) < new Date();
};

export const getTypeColor = (type: string): string => {
  return TYPE_COLORS[type as keyof typeof TYPE_COLORS] || "#D4537E";
};

export const getTypeBg = (type: string): string => {
  return TYPE_BG[type as keyof typeof TYPE_BG] || "#FFF5F8";
};
