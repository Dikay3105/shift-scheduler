import { useEffect, useState, useCallback } from "react";
import type {
  ScheduleState,
  Employee,
  Shift,
  Assignments,
} from "@/lib/schedule-types";

import { scheduleApi } from "@/services/api";

export function useSchedule() {
  const [state, setState] = useState<
    ScheduleState & {
      scheduleMap: Record<string, string>;
    }
  >({
    employees: [],
    shifts: [],
    assignments: {},
    scheduleMap: {},
  });

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      const startDate = "2025-01-01";
      const endDate = "2026-12-31";

      const [empRes, shiftRes, scheduleRes] = await Promise.all([
        scheduleApi.getEmployees(),
        scheduleApi.getShifts(),
        scheduleApi.getSchedules(startDate, endDate),
      ]);

      const employees = empRes.data || [];
      const shiftsApi = shiftRes.data || [];
      const schedules = scheduleRes.data || [];

      const assignments: Assignments = {};
      const scheduleMap: Record<string, string> = {};

      schedules.forEach((sch: any) => {
        const dateKey = sch.date.split("T")[0];

        const empId = sch.employee?._id || sch.employee;
        const shiftId = sch.shift?._id || sch.shift;

        const key = `${empId}|${dateKey}`;

        assignments[key] = shiftId;
        scheduleMap[key] = sch._id;
      });

      const EMP_PALETTE = [
        "#db2777", "#0369a1", "#059669", "#b45309",
        "#dc2626", "#0891b2", "#7c3aed", "#1e293b",
        "#e11d48", "#0d9488", "#9333ea", "#ca8a04",
        "#2563eb", "#16a34a", "#ea580c", "#475569",
      ];

      setState({
        employees: employees.map((emp: any, idx: number) => ({
          id: emp._id,
          name: emp.fullName,
          color: emp.color || EMP_PALETTE[idx % EMP_PALETTE.length],
          role: emp.position,
        })),

        shifts: shiftsApi.map((s: any) => ({
          id: s._id,
          code: s.shiftCode,
          label: "",
          start: s.startTime,
          end: s.endTime,
          bg: s.color || "#dbeafe",
          fg: "#1e40af",
        })),

        assignments,
        scheduleMap,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ================= EMPLOYEES =================

  const addEmployee = useCallback(
    async (name: string, color: string, role?: string) => {
      await scheduleApi.createEmployee({
        employeeCode: `NV${Date.now().toString().slice(-4)}`,
        fullName: name,
        email: `employee${Date.now()}@gmail.com`,
        phone: "0987654321",
        position: role || "",
      });

      await fetchAllData();
    },
    [fetchAllData]
  );

  const updateEmployee = useCallback(
    async (id: string, patch: Partial<Employee>) => {
      await scheduleApi.updateEmployee(id, {
        fullName: patch.name,
        position: patch.role,
      });

      await fetchAllData();
    },
    [fetchAllData]
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      if (!confirm("Xóa nhân viên này?")) return;

      await scheduleApi.deleteEmployee(id);

      await fetchAllData();
    },
    [fetchAllData]
  );

  // ================= SHIFTS =================

  const addShift = useCallback(
    async (shift: Omit<Shift, "id">) => {
      try {
        await scheduleApi.createShift({
          shiftCode: shift.code,           // ← Phải map đúng tên field
          startTime: shift.start,          // "08:00"
          endTime: shift.end,              // "16:00"
          color: shift.bg,                 // Màu nền
          session: shift.session || 'morning', // Thêm session (quan trọng)
          // isActive: true,               // BE đã có default = true
        });

        await fetchAllData();
        // Có thể thêm toast thông báo thành công
      } catch (error) {
        console.error("Lỗi khi thêm ca:", error);
        // Xử lý lỗi (toast error)
      }
    },
    [fetchAllData]
  );

  const updateShift = useCallback(
    async (id: string, patch: Partial<Shift>) => {
      try {
        await scheduleApi.updateShift(id, {
          shiftCode: patch.code,
          startTime: patch.start,
          endTime: patch.end,
          color: patch.bg,
          session: patch.session,           // ← Thêm session
          // isActive: patch.isActive,      // Nếu cần cập nhật trạng thái active
        });

        await fetchAllData();
      } catch (error) {
        console.error("Lỗi khi cập nhật ca:", error);
        // TODO: Thêm thông báo lỗi (toast)
      }
    },
    [fetchAllData]
  );

  const deleteShift = useCallback(
    async (id: string) => {
      if (!confirm("Xóa ca này?")) return;

      await scheduleApi.deleteShift(id);

      await fetchAllData();
    },
    [fetchAllData]
  );

  // ================= ASSIGNMENTS =================

  const setAssignment = useCallback(
    async (
      empId: string,
      dateKey: string,
      shiftId: string | null
    ) => {
      const key = `${empId}|${dateKey}`;

      const existingScheduleId = state.scheduleMap[key];

      // ===== DELETE =====
      if (!shiftId) {
        if (existingScheduleId) {
          await scheduleApi.deleteSchedule(existingScheduleId);
        }

        await fetchAllData();
        return;
      }

      // ===== UPDATE =====
      if (existingScheduleId) {
        await scheduleApi.updateSchedule(existingScheduleId, {
          shift: shiftId,
        });
      }

      // ===== CREATE =====
      else {
        await scheduleApi.createSchedule({
          employee: empId,
          shift: shiftId,
          date: dateKey,
        });
      }

      await fetchAllData();
    },
    [fetchAllData, state.scheduleMap]
  );

  const clearWeek = useCallback(
    async (dayKeys: string[]) => {
      const promises: Promise<any>[] = [];

      Object.entries(state.scheduleMap).forEach(([key, scheduleId]) => {
        const [, dateKey] = key.split("|");

        if (dayKeys.includes(dateKey)) {
          promises.push(scheduleApi.deleteSchedule(scheduleId));
        }
      });

      await Promise.all(promises);

      await fetchAllData();
    },
    [fetchAllData, state.scheduleMap]
  );

  const copyWeek = useCallback(
    async (sourceStartDate: string, targetStartDate: string) => {
      await scheduleApi.copyWeek(sourceStartDate, targetStartDate);
      await fetchAllData();
    },
    [fetchAllData]
  );

  return {
    state,
    hydrated,
    loading,

    addEmployee,
    updateEmployee,
    deleteEmployee,

    addShift,
    updateShift,
    deleteShift,

    setAssignment,
    clearWeek,
    copyWeek,

    refresh: fetchAllData,
  };
}