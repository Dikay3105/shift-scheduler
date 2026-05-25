import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
    ArrowLeft,
    Bell,
    Search,
    Info,
    CheckCircle,
    AlertTriangle,
    XCircle,
    BellRing,
    Check,
    Trash2,
    ExternalLink,
} from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/use-notifications";

// ─── Config ──────────────────────────────────────────────────────────────────

type NotificationType = "info" | "success" | "warning" | "error" | "alert";

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
    info: <Info className="h-4 w-4" />,
    success: <CheckCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    error: <XCircle className="h-4 w-4" />,
    alert: <BellRing className="h-4 w-4" />,
};

const TYPE_STYLE: Record<NotificationType, string> = {
    info: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    error: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    alert: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
};

const PRIORITY_LABEL: Record<number, string> = { 1: "Cao", 2: "Khẩn cấp" };
const PRIORITY_STYLE: Record<number, string> = {
    1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    2: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: Date | string): string {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Vừa xong";
    if (m < 60) return `${m}ph trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}g trước`;
    return `${Math.floor(h / 24)}ng trước`;
}

// ─── NotificationPanel ───────────────────────────────────────────────────────

type NotificationPanelProps = {
    notifications: Notification[];
    loading: boolean;
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onDelete: (id: string) => void;
};

function NotificationPanel({
    notifications,
    loading,
    onMarkRead,
    onMarkAllRead,
    onDelete,
}: NotificationPanelProps) {
    const [tab, setTab] = useState<"all" | "unread">("all");

    const visible =
        tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[400px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">Thông báo</span>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-medium text-white">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAllRead}
                        className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                    >
                        Đánh dấu tất cả đã đọc
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {(["all", "unread"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 text-[13px] transition-colors ${tab === t
                            ? "border-b-2 border-foreground font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {t === "all" ? "Tất cả" : "Chưa đọc"}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                        <BellRing className="h-8 w-8 opacity-30" />
                        Không có thông báo nào
                    </div>
                ) : (
                    visible.map((n) => {
                        const isLocked = n.canMarkAsRead === false;
                        return n.link ? (
                            <a key={n._id} href={n.link} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
                                <NotificationItem
                                    notification={n}
                                    onMarkRead={isLocked ? undefined : onMarkRead}
                                    onDelete={isLocked ? undefined : onDelete}
                                />
                            </a>
                        ) : (
                            <NotificationItem
                                key={n._id}
                                notification={n}
                                onMarkRead={isLocked ? undefined : onMarkRead}
                                onDelete={isLocked ? undefined : onDelete}
                            />
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5 text-center">
                <a
                    href="/notifications"
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Xem tất cả thông báo →
                </a>
            </div>
        </div>
    );
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

type NotificationItemProps = {
    notification: Notification;
    onMarkRead?: (id: string) => void;  // optional
    onDelete?: (id: string) => void;    // optional
};

function NotificationItem({
    notification: n,
    onMarkRead,
    onDelete,
}: NotificationItemProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className={`group relative flex gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 ${n.priority === 2
                ? "bg-red-50/80 dark:bg-red-950/20 border-l-2 border-l-red-500"
                : !n.isRead
                    ? "bg-blue-50/60 dark:bg-blue-950/20"
                    : "hover:bg-muted/40"
                }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Icon */}
            <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${TYPE_STYLE[n.type]}`}
            >
                {ICON_MAP[n.type]}
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                        {n.title}
                    </span>
                    {n.priority > 0 && (
                        <span
                            className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[n.priority]}`}
                        >
                            {PRIORITY_LABEL[n.priority]}
                        </span>
                    )}
                </div>

                <p className="truncate text-[12px] leading-relaxed text-muted-foreground">
                    {n.content}
                </p>

                <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground/70">
                        {relativeTime(n.scheduledAt)}
                    </span>
                    {!n.isRead && (
                        <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                </div>
            </div>

            {/* Actions (hover) */}
            {hovered && (
                <div className="absolute right-3 top-3 flex gap-1">
                    {onMarkRead && !n.isRead && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkRead(n._id);
                            }}
                            title="Đánh dấu đã đọc"
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                        >
                            <Check className="h-3 w-3" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(n._id);
                            }}
                            title="Xóa"
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-destructive"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── AdminHeader ──────────────────────────────────────────────────────────────

type AdminHeaderProps = {
    title: string;
    description?: string;
    backTo?: string;
};

export default function AdminHeader({ title, description, backTo }: AdminHeaderProps) {
    const { notifications, loading, unreadCount, markRead, markAllRead, deleteNotification } =
        useNotifications();

    const [panelOpen, setPanelOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Click ngoài đóng panel
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setPanelOpen(false);
            }
        }
        if (panelOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [panelOpen]);

    return (
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                {/* Left */}
                <div className="flex items-center gap-4">
                    {backTo && (
                        <Link to={backTo}>
                            <button className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background transition hover:bg-muted">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        </Link>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background transition hover:bg-muted">
                        <Search className="h-4 w-4" />
                    </button>

                    {/* Bell + Panel */}
                    <div className="relative" ref={panelRef}>
                        <button
                            aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ""}`}
                            aria-expanded={panelOpen}
                            aria-haspopup="dialog"
                            onClick={() => setPanelOpen((v) => !v)}
                            className="relative flex h-10 w-10 items-center justify-center rounded-xl border bg-background transition hover:bg-muted"
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white ring-2 ring-background animate-pulse">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {panelOpen && (
                            <NotificationPanel
                                notifications={notifications}
                                loading={loading}
                                onMarkRead={markRead}
                                onMarkAllRead={markAllRead}
                                onDelete={deleteNotification}
                            />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
