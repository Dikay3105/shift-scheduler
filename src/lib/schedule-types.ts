export type Employee = {
  id: string;
  name: string;
  color: string; // hex
  role?: string; // chức vụ
};

export const ROLE_PRESETS = [
  "Quản lý",
  "Trưởng ca",
  "Nhân viên",
  "Thu ngân",
  "Phục vụ",
  "Bếp",
  "Pha chế",
  "Bảo vệ",
] as const;

export type ShiftGroup = "sang" | "chieu" | "toi";

export type Shift = {
  id: string;
  code: string; // e.g. "S1"
  label: string; // e.g. "Sáng 1"
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  group: ShiftGroup;
  bg: string; // background hex
  fg: string; // text hex
  session?: "morning" | "afternoon" | "evening" | "night";
};

// key: `${employeeId}|${YYYY-MM-DD}` -> shiftId
export type Assignments = Record<string, string>;

export type ScheduleState = {
  employees: Employee[];
  shifts: Shift[];
  assignments: Assignments;
};
