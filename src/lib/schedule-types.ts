export type Employee = {
  id: string;
  name: string;
  color: string; // hex
};

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
};

// key: `${employeeId}|${YYYY-MM-DD}` -> shiftId
export type Assignments = Record<string, string>;

export type ScheduleState = {
  employees: Employee[];
  shifts: Shift[];
  assignments: Assignments;
};
