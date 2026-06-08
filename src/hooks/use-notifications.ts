import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { scheduleApi } from "@/services/api";
import { getSocket } from "@/lib/socket";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "alert";

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

      const list: Notification[] = Array.isArray(res)
        ? res
        : (res?.data ?? []);

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
    const socket = getSocket();

    if (!socket) return;

    socketRef.current = socket;

    const onConnect = () => {
      console.log("🔌 Socket connected:", socket.id);
    };

    const onDisconnect = () => {
      console.log("❌ Socket disconnected");
    };

    const onWarehouseAlert = (notification: Notification) => {
      console.log("🔔 warehouse-alert received:", notification);

      setNotifications((prev) => {
        const exists = prev.find((n) => n._id === notification._id);

        if (exists) {
          return prev.map((n) =>
            n._id === notification._id
              ? { ...n, ...notification }
              : n
          );
        }

        return [notification, ...prev];
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("warehouse-alert", onWarehouseAlert);

    fetchNotifications();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("warehouse-alert", onWarehouseAlert);

      // KHÔNG disconnect singleton socket ở đây
      // socket.disconnect();
    };
  }, [fetchNotifications]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === id && n.canMarkAsRead
          ? { ...n, isRead: true }
          : n
      )
    );

    try {
      await scheduleApi.markNotificationRead(id);
    } catch (error) {
      console.error("markRead error:", error);

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, isRead: false } : n
        )
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.canMarkAsRead ? { ...n, isRead: true } : n
      )
    );

    try {
      const unread = notifications.filter(
        (n) => !n.isRead && n.canMarkAsRead
      );

      await Promise.all(
        unread.map((n) =>
          scheduleApi.markNotificationRead(n._id)
        )
      );
    } catch (error) {
      console.error("markAllRead error:", error);
      await fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  const deleteNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.filter((n) => n._id !== id)
      );

      try {
        await scheduleApi.deleteNotification(id);
      } catch (error) {
        console.error("deleteNotification error:", error);
        await fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  // ── Derived ──────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter(
    (n) => !n.isRead
  ).length;

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