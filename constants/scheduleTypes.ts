export type ScheduleType = "Quiz" | "Activity" | "Review" | "Class" | "Duty" | "Study" | "General";

export const TYPES: ScheduleType[] = ["Quiz", "Activity", "Review", "Class", "Duty", "Study", "General"];

export const TYPE_COLORS: Record<ScheduleType, string> = {
  Quiz:     "#BA7517", // amber
  Activity: "#0F6E56", // teal 600 — deep enough for light mode, vivid in dark
  Review:   "#534AB7", // purple
  Class:    "#185FA5", // blue  — replaces the near-invisible yellow-green
  Duty:     "#993556", // pink
  Study:    "#378ADD", // blue
  General:  "#3B6D11", // green
};

export const TYPE_BG: Record<ScheduleType, string> = {
  Quiz:     "#FAEEDA", // amber tint
  Activity: "#E1F5EE", // teal tint  ✅ now matches the teal text
  Review:   "#EEEDFE", // purple tint
  Class:    "#E6F1FB", // blue tint  ✅ now matches the blue text
  Duty:     "#FBEAF0", // pink tint
  Study:    "#EBF3FC", // blue tint
  General:  "#EAF3DE", // green tint ✅ now matches the green text
};