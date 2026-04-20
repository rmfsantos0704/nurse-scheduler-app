export type ScheduleType = "Quiz" | "Activity" | "Review" | "Class" | "Duty" | "Study" | "General";

export const TYPES: ScheduleType[] = ["Quiz", "Activity", "Review", "Class", "Duty", "Study", "General"];

export const TYPE_COLORS: Record<ScheduleType, string> = {
  Quiz: "#BA7517",
  Activity: "rgb(31, 160, 160)",
  Review: "#7F77DD",
  Class: "#c5cf08",
  Duty: "#D4537E",
  Study: "#378ADD",
  General: "#21a702",
};

export const TYPE_BG: Record<ScheduleType, string> = {
  Quiz: "#FAEEDA",
  Activity: "#EAF3DE",
  Review: "#EEEDFE",
  Class: "#E6F1FB",
  Duty: "#FBEAF0",
  Study: "#E6F1FB",
  General: "#E6F1FB",
};
