// src/lib/socket.ts — thêm event "requestOnlineCount"
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:5000";

export const socket: Socket = io(SOCKET_URL, {
    transports: ["polling", "websocket"],
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 10000,
});

socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
socket.on("connect_error", (e) => console.warn("⚠️ Socket error:", e.message));