import { useEffect, useState, useCallback } from "react";
import type { ScheduleState, Employee, Shift, Assignments } from "@/lib/schedule-types";

const STORAGE_KEY = "schedule-v1";

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Nguyễn Văn A", color: "#db2777", role: "Quản lý" },
  { id: "e2", name: "Trần Thị B", color: "#0369a1", role: "Thu ngân" },
  { id: "e3", name: "Lê Văn C", color: "#059669", role: "Phục vụ" },
  { id: "e4", name: "Phạm Thị D", color: "#b45309", role: "Bếp" },
];

const DEFAULT_SHIFTS: Shift[] = [
  { id: "s1", code: "S1", label: "Sáng 1", start: "06:00", end: "10:00", group: "sang", bg: "#dbeafe", fg: "#1d4ed8" },
  { id: "s2", code: "S2", label: "Sáng 2", start: "08:00", end: "12:00", group: "sang", bg: "#dbeafe", fg: "#1d4ed8" },
  { id: "c1", code: "C1", label: "Chiều 1", start: "12:00", end: "16:00", group: "chieu", bg: "#fef9c3", fg: "#92400e" },
  { id: "c2", code: "C2", label: "Chiều 2", start: "14:00", end: "18:00", group: "chieu", bg: "#fef9c3", fg: "#92400e" },
  { id: "t1", code: "T1", label: "Tối 1", start: "18:00", end: "22:00", group: "toi", bg: "#ede9fe", fg: "#5b21b6" },
  { id: "t2", code: "T2", label: "Tối 2", start: "20:00", end: "24:00", group: "toi", bg: "#ede9fe", fg: "#5b21b6" },
];

const DEFAULT_STATE: ScheduleState = {
  employees: DEFAULT_EMPLOYEES,
  shifts: DEFAULT_SHIFTS,
  assignments: {},
};

function loadState(): ScheduleState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as ScheduleState;
    return {
      employees: parsed.employees ?? DEFAULT_EMPLOYEES,
      shifts: parsed.shifts ?? DEFAULT_SHIFTS,
      assignments: parsed.assignments ?? {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useSchedule() {
  const [state, setState] = useState<ScheduleState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // Employees
  const addEmployee = useCallback((name: string, color: string) => {
    setState((s) => ({
      ...s,
      employees: [...s.employees, { id: `e_${Date.now()}`, name, color }],
    }));
  }, []);
  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);
  const deleteEmployee = useCallback((id: string) => {
    setState((s) => {
      const assignments: Assignments = {};
      for (const [k, v] of Object.entries(s.assignments)) {
        if (!k.startsWith(`${id}|`)) assignments[k] = v;
      }
      return {
        ...s,
        employees: s.employees.filter((e) => e.id !== id),
        assignments,
      };
    });
  }, []);

  // Shifts
  const addShift = useCallback((shift: Omit<Shift, "id">) => {
    setState((s) => ({
      ...s,
      shifts: [...s.shifts, { ...shift, id: `s_${Date.now()}` }],
    }));
  }, []);
  const updateShift = useCallback((id: string, patch: Partial<Shift>) => {
    setState((s) => ({
      ...s,
      shifts: s.shifts.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
    }));
  }, []);
  const deleteShift = useCallback((id: string) => {
    setState((s) => {
      const assignments: Assignments = {};
      for (const [k, v] of Object.entries(s.assignments)) {
        if (v !== id) assignments[k] = v;
      }
      return {
        ...s,
        shifts: s.shifts.filter((sh) => sh.id !== id),
        assignments,
      };
    });
  }, []);

  // Assignments
  const setAssignment = useCallback((empId: string, dateKey: string, shiftId: string | null) => {
    setState((s) => {
      const key = `${empId}|${dateKey}`;
      const next = { ...s.assignments };
      if (shiftId === null) delete next[key];
      else next[key] = shiftId;
      return { ...s, assignments: next };
    });
  }, []);

  const clearWeek = useCallback((dateKeys: string[]) => {
    setState((s) => {
      const set = new Set(dateKeys);
      const next: Assignments = {};
      for (const [k, v] of Object.entries(s.assignments)) {
        const [, dk] = k.split("|");
        if (!set.has(dk)) next[k] = v;
      }
      return { ...s, assignments: next };
    });
  }, []);

  return {
    state,
    hydrated,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addShift,
    updateShift,
    deleteShift,
    setAssignment,
    clearWeek,
  };
}
