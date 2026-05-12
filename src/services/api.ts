// src/services/api.ts
const API_BASE = "http://localhost:5000/api";   // ← Thay đổi khi deploy

export const scheduleApi = {
  // ============== EMPLOYEES ==============
  getEmployees: async () => {
    const res = await fetch(`${API_BASE}/employees`);
    return res.json();
  },

  createEmployee: async (data: any) => {
    const res = await fetch(`${API_BASE}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateEmployee: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteEmployee: async (id: string) => {
    const res = await fetch(`${API_BASE}/employees/${id}`, { method: "DELETE" });
    return res.json();
  },

  // ============== SHIFTS ==============
  getShifts: async () => {
    const res = await fetch(`${API_BASE}/shifts`);
    return res.json();
  },

  createShift: async (data: any) => {
    const res = await fetch(`${API_BASE}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateShift: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/shifts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteShift: async (id: string) => {
    const res = await fetch(`${API_BASE}/shifts/${id}`, { method: "DELETE" });
    return res.json();
  },

  // ============== SCHEDULES ==============
  getSchedules: async (startDate?: string) => {
    const url = startDate
      ? `${API_BASE}/schedules?startDate=${startDate}`
      : `${API_BASE}/schedules`;
    const res = await fetch(url);
    return res.json();
  },

  createSchedule: async (data: { employee: string; shift: string; date: string }) => {
    const res = await fetch(`${API_BASE}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // TODO: Thêm deleteSchedule nếu cần sau này
};