export type ScheduleType = "Quiz" | "Activity" | "Review" | "Class" | "Duty" | "Study";

export const TYPES: ScheduleType[] = ["Quiz", "Activity", "Review", "Class", "Duty", "Study"];

export const TYPE_COLORS: Record<ScheduleType, string> = {
  Quiz: "#BA7517",
  Activity: "#639922",
  Review: "#7F77DD",
  Class: "#378ADD",
  Duty: "#D4537E",
  Study: "#378ADD",
};

export const TYPE_BG: Record<ScheduleType, string> = {
  Quiz: "#FAEEDA",
  Activity: "#EAF3DE",
  Review: "#EEEDFE",
  Class: "#E6F1FB",
  Duty: "#FBEAF0",
  Study: "#E6F1FB",
};
