// src/hooks/use-schedule.ts
import { useEffect, useState, useCallback } from "react";
import type { ScheduleState, Employee, Shift, Assignments } from "@/lib/schedule-types";
import { scheduleApi } from "@/services/api";

export function useSchedule() {
  const [state, setState] = useState<ScheduleState>({
    employees: [],
    shifts: [],
    assignments: {},
  });
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch tất cả dữ liệu
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, shiftRes, scheduleRes] = await Promise.all([
        scheduleApi.getEmployees(),
        scheduleApi.getShifts(),
        scheduleApi.getSchedules(new Date().toISOString().slice(0, 10)),
      ]);

      const employees: any[] = empRes.data || [];
      const shiftsApi: any[] = shiftRes.data || [];
      const schedules: any[] = scheduleRes.data || [];

      // Chuyển đổi assignments
      const assignments: Assignments = {};
      schedules.forEach((sch: any) => {
        const dateKey = sch.date.split("T")[0];
        const empId = sch.employee?._id || sch.employee;
        const shiftId = sch.shift?._id || sch.shift;
        if (empId && shiftId) {
          assignments[`${empId}|${dateKey}`] = shiftId;
        }
      });

      setState({
        employees: employees.map((emp) => ({
          id: emp._id,
          name: emp.fullName,
          color: "#3b82f6",
          role: emp.position,
        })),

        shifts: shiftsApi.map((s) => ({
          id: s._id,
          code: s.shiftCode,
          label: "",
          start: s.startTime,
          end: s.endTime,
          bg: s.color || "#dbeafe",
          fg: "#1e40af",
        })),

        assignments,
      });
    } catch (error) {
      console.error("Lỗi fetch data:", error);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ==================== EMPLOYEES ====================
  const addEmployee = useCallback(async (name: string, color: string, role?: string) => {
    const res = await scheduleApi.createEmployee({
      employeeCode: `NV${Date.now().toString().slice(-4)}`,
      fullName: name,
      email: `employee${Date.now()}@gmail.com`,
      phone: "0987654321",
      position: role || "",
    });
    if (res.success) await fetchAllData();
  }, [fetchAllData]);

  const updateEmployee = useCallback(async (id: string, patch: Partial<Employee>) => {
    await scheduleApi.updateEmployee(id, {
      fullName: patch.name,
      position: patch.role,
    });
    await fetchAllData();
  }, [fetchAllData]);

  const deleteEmployee = useCallback(async (id: string) => {
    if (!confirm("Xóa nhân viên này?")) return;
    await scheduleApi.deleteEmployee(id);
    await fetchAllData();
  }, [fetchAllData]);

  // ==================== SHIFTS ====================
  const addShift = useCallback(async (shift: Omit<Shift, "id">) => {
    const res = await scheduleApi.createShift({
      shiftCode: shift.code,
      shiftName: "",
      startTime: shift.start,
      endTime: shift.end,
      color: shift.bg,
    });
    if (res.success) await fetchAllData();
  }, [fetchAllData]);

  const updateShift = useCallback(async (id: string, patch: Partial<Shift>) => {
    await scheduleApi.updateShift(id, {
      shiftCode: patch.code,
      shiftName: "",
      startTime: patch.start,
      endTime: patch.end,
      color: patch.bg,
    });
    await fetchAllData();
  }, [fetchAllData]);

  const deleteShift = useCallback(async (id: string) => {
    if (!confirm("Xóa ca này?")) return;
    await scheduleApi.deleteShift(id);
    await fetchAllData();
  }, [fetchAllData]);

  // ==================== ASSIGNMENTS ====================
  const setAssignment = useCallback(async (empId: string, dateKey: string, shiftId: string | null) => {
    if (!shiftId) return;
    await scheduleApi.createSchedule({ employee: empId, shift: shiftId, date: dateKey });
    await fetchAllData();
  }, [fetchAllData]);

  const clearWeek = useCallback(async () => {
    alert("Chức năng xóa tuần chưa được hỗ trợ bulk delete.");
    await fetchAllData();
  }, [fetchAllData]);

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
    refresh: fetchAllData,
  };
}