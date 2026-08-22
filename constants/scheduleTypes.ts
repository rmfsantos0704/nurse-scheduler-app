export type ScheduleType = "Quiz" | "Activity" | "Review" | "Class" | "Duty" | "Study" | "General";

export const TYPES: ScheduleType[] = ["Class", "Quiz", "Activity", "Review", "Duty", "Study", "General"];

export const TYPE_COLORS: Record<ScheduleType, string> = {
  Quiz:     "#BA7517",
  Activity: "rgb(31,160,160)",
  Review:   "#7F77DD",
  Class:    "#c5cf08",
  Duty:     "#D4537E",
  Study:    "#378ADD",
  General:  "#21a702",
};

export const TYPE_BG: Record<ScheduleType, string> = {
  Quiz:     "rgba(186, 117, 23,  0.15)",
  Activity: "rgba(31,  160, 160, 0.15)",
  Review:   "rgba(127, 119, 221, 0.15)",
  Class:    "rgba(197, 207, 8,   0.15)",
  Duty:     "rgba(212, 83,  126, 0.15)",
  Study:    "rgba(55,  138, 221, 0.15)",
  General:  "rgba(33,  167, 2,   0.15)",
};