const API_BASE = import.meta.env.VITE_API_BASE_URL;// Update this to your actual API base URL

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

  // Copy toàn bộ lịch từ tuần nguồn sang tuần đích (giữ nguyên nhân viên + ca, dịch ngày 7*N)
  copyWeek: async (sourceStartDate: string, targetStartDate: string) => {
    // Ưu tiên gọi endpoint chuyên dụng nếu BE có sẵn
    try {
      const res = await fetch(`${API_BASE}/schedules/copy-week`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceStartDate, targetStartDate }),
      });
      if (res.ok) return res.json();
    } catch {
      // ignore, fallback bên dưới
    }

    // Fallback: tự compose từ các endpoint sẵn có
    const addDaysStr = (dateStr: string, n: number) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + n);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const sourceEnd = addDaysStr(sourceStartDate, 6);
    const targetEnd = addDaysStr(targetStartDate, 6);

    const [sourceRes, targetRes] = await Promise.all([
      fetch(`${API_BASE}/schedules?startDate=${sourceStartDate}&endDate=${sourceEnd}`).then((r) => r.json()),
      fetch(`${API_BASE}/schedules?startDate=${targetStartDate}&endDate=${targetEnd}`).then((r) => r.json()),
    ]);

    const sourceList: any[] = sourceRes.data || [];
    const targetList: any[] = targetRes.data || [];

    // Xoá toàn bộ lịch tuần đích trước
    await Promise.all(
      targetList.map((sch: any) =>
        fetch(`${API_BASE}/schedules/${sch._id}`, { method: "DELETE" })
      )
    );

    // Tạo lại theo source (dịch ngày)
    const srcStart = new Date(sourceStartDate);
    await Promise.all(
      sourceList.map((sch: any) => {
        const srcDate = new Date(String(sch.date).split("T")[0]);
        const offset = Math.round(
          (srcDate.getTime() - srcStart.getTime()) / 86400000
        );
        const newDate = addDaysStr(targetStartDate, offset);
        const empId = sch.employee?._id || sch.employee;
        const shiftId = sch.shift?._id || sch.shift;
        return fetch(`${API_BASE}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee: empId, shift: shiftId, date: newDate }),
        });
      })
    );

    return { success: true };
  },

  // ============== DOCUMENTS ==============

  getDocuments: async () => {
    const res = await fetch(`${API_BASE}/documents`);

    return res.json();
  },

  getDocumentById: async (id: string) => {
    const res = await fetch(`${API_BASE}/documents/${id}`);

    return res.json();
  },

  createDocument: async (data: {
    title: string;
    category?: string;
    htmlContent?: string;
    content?: any;
    attachments?: any[];
  }) => {
    const res = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return res.json();
  },

  updateDocument: async (
    id: string,
    data: any
  ) => {
    const res = await fetch(
      `${API_BASE}/documents/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    return res.json();
  },

  deleteDocument: async (id: string) => {
    const res = await fetch(
      `${API_BASE}/documents/${id}`,
      {
        method: "DELETE",
      }
    );

    return res.json();
  },

  uploadDocumentFile: async (
    file: File
  ) => {
    const formData = new FormData();

    formData.append("file", file);

    const res = await fetch(
      `${API_BASE}/documents/upload/file`,
      {
        method: "POST",
        body: formData,
      }
    );

    return res.json();
  },
};