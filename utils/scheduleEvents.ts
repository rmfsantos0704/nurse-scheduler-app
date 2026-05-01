// utils/scheduleEvents.ts
import { EventEmitter } from "eventemitter3";

export const scheduleEvents = new EventEmitter();

// Call this whenever a schedule is created, updated, or completed
export const notifyScheduleChanged = () => {
  scheduleEvents.emit("scheduleChanged");
};