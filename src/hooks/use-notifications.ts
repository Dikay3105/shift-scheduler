import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { scheduleApi } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = "info" | "success" | "warning" | "error" | "alert";

export type Notification = {
  _id: string;
  title: string;
  content: string;
  scheduledAt: string;
  link?: string;
  type: NotificationType;
  isRead: boolean;
  canMarkAsRead: boolean;
  isDeleted: boolean;
  priority: 0 | 1 | 2;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch từ API ─────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.getNotifications();
      // BE trả về array hoặc { data: [] }
      const list: Notification[] = Array.isArray(res) ? res : (res?.data ?? []);
      // Lọc bỏ isDeleted, sort mới nhất lên đầu
      setNotifications(
        list
          .filter((n) => !n.isDeleted)
          .sort(
            (a, b) =>
              new Date(b.scheduledAt).getTime() -
              new Date(a.scheduledAt).getTime()
          )
      );
    } catch (error) {
      console.error("fetchNotifications error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket.io realtime ───────────────────────────────────────────────────

  useEffect(() => {
    const SOCKET_URL =
      import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "";

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    // Server emit "warehouse-alert" khi có sản phẩm đỏ
    socket.on("warehouse-alert", (notification: Notification) => {
      console.log("🔔 warehouse-alert received:", notification);
      setNotifications((prev) => {
        // Nếu đã tồn tại thì update, chưa có thì thêm đầu
        const exists = prev.find((n) => n._id === notification._id);
        if (exists) {
          return prev.map((n) =>
            n._id === notification._id ? { ...n, ...notification } : n
          );
        }
        return [notification, ...prev];
      });
    });

    // Fetch lần đầu
    fetchNotifications();

    return () => {
      socket.disconnect();
    };
  }, [fetchNotifications]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === id && n.canMarkAsRead ? { ...n, isRead: true } : n
      )
    );
    try {
      await scheduleApi.markNotificationRead(id);
    } catch (error) {
      console.error("markRead error:", error);
      // Rollback nếu lỗi
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: false } : n))
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.canMarkAsRead ? { ...n, isRead: true } : n))
    );
    try {
      // Gọi song song cho tất cả chưa đọc
      const unread = notifications.filter((n) => !n.isRead && n.canMarkAsRead);
      await Promise.all(unread.map((n) => scheduleApi.markNotificationRead(n._id)));
    } catch (error) {
      console.error("markAllRead error:", error);
      await fetchNotifications(); // Refetch để đồng bộ lại
    }
  }, [notifications, fetchNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await scheduleApi.deleteNotification(id);
    } catch (error) {
      console.error("deleteNotification error:", error);
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
