const API_BASE = "https://cfwebbe.onrender.com/api"; // Update this to your actual API base URL

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
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: "DELETE",
    });

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
    const res = await fetch(`${API_BASE}/shifts/${id}`, {
      method: "DELETE",
    });

    return res.json();
  },

  // ============== SCHEDULES ==============
  getSchedules: async (startDate: string, endDate: string) => {
    const res = await fetch(
      `${API_BASE}/schedules?startDate=${startDate}&endDate=${endDate}`
    );

    return res.json();
  },

  createSchedule: async (data: {
    employee: string;
    shift: string;
    date: string;
  }) => {
    const res = await fetch(`${API_BASE}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return res.json();
  },

  updateSchedule: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return res.json();
  },

  deleteSchedule: async (id: string) => {
    const res = await fetch(`${API_BASE}/schedules/${id}`, {
      method: "DELETE",
    });

    return res.json();
  },
};