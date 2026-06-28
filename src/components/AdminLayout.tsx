import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
    CalendarDays, UserCog, Image, Package2, ShieldCheck,
    Sparkles, LayoutDashboard, Settings, ChevronRight,
    Bell, Search, Sun, Moon, Monitor, Check,
    PanelLeftOpen, PanelLeftClose, Menu, X, CheckCircle
} from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";

const SIDEBAR_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, link: "/" },
    { label: "Lịch làm việc", icon: CalendarDays, link: "/schedule" },
    { label: "Nội quy", icon: ShieldCheck, link: "/rule" },
    { label: "Quản lý kho", icon: Package2, link: "https://inventory.cinnamonforest.com/", external: true },
    { label: "Thẻ nhân viên", icon: UserCog, link: "/employeeCard" },
    { label: "Avatar", icon: Image, link: "/avatar" },
    { label: "Content AI", icon: Sparkles, link: "/aiPosts", badge: "AI" },
    { label: "Báo cáo công việc", icon: CheckCircle, link: "/TaskReport" },
];

const SUB_PAGES: Record<string, { parent: string; label: string }> = {
    "/aiContent": { parent: "/aiPosts", label: "Tạo nội dung" },
};

function ThemeMenu() {
    const { mode, setMode } = useTheme();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;
    const opts: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
        { id: "light", label: "Sáng", icon: Sun },
        { id: "dark", label: "Tối", icon: Moon },
        { id: "system", label: "Theo hệ thống", icon: Monitor },
    ];

    return (
        <div className="relative" ref={ref}>
            <button
                title="Giao diện"
                onClick={() => setOpen(v => !v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-accent transition-colors border-none cursor-pointer text-muted-foreground"
            >
                <Icon size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-48 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Giao diện
                    </div>
                    {opts.map(o => {
                        const Oi = o.icon;
                        const active = mode === o.id;
                        return (
                            <button
                                key={o.id}
                                onClick={() => { setMode(o.id); setOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-accent text-left border-none bg-transparent cursor-pointer"
                            >
                                <Oi size={14} className="text-muted-foreground" />
                                <span className="flex-1">{o.label}</span>
                                {active && <Check size={13} className="text-primary" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const currentPath = location.pathname;

    const sub = SUB_PAGES[currentPath];
    const activeSidebarLink = sub ? sub.parent : currentPath;
    const parentItem = SIDEBAR_ITEMS.find(i => i.link === activeSidebarLink);
    const parentLabel = parentItem?.label ?? "Dashboard";
    const breadcrumb = sub?.label || parentLabel;

    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("sidebar-collapsed") === "true";
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(collapsed));
    }, [collapsed]);

    // Close mobile sidebar on route change
    useEffect(() => { setMobileOpen(false); }, [currentPath]);

    // Lock body scroll while mobile drawer open
    useEffect(() => {
        if (mobileOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = prev; };
        }
    }, [mobileOpen]);

    const renderNavItem = (item: typeof SIDEBAR_ITEMS[number], compact: boolean) => {
        const Icon = item.icon;
        const isActive = item.link === activeSidebarLink;
        const inner = (
            <div
                title={compact ? item.label : undefined}
                className={`flex items-center px-3 py-2.5 rounded-lg mb-0.5 cursor-pointer ${compact ? "justify-center" : "gap-3"}`}
                style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                }}
            >
                <Icon size={16} style={{ color: isActive ? "#F4C5CF" : "rgba(255,255,255,0.55)" }} />
                {!compact && (
                    <span
                        className="text-[13px] flex-1"
                        style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }}
                    >
                        {item.label}
                    </span>
                )}
                {!compact && item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#8B1A38", color: "#fff" }}>
                        {item.badge}
                    </span>
                )}
                {!compact && isActive && (
                    <ChevronRight size={12} style={{ color: "#F4C5CF" }} />
                )}
            </div>
        );
        if (item.external)
            return (
                <button
                    key={item.label}
                    type="button"
                    className="w-full text-left bg-transparent border-none p-0"
                    onClick={() => {
                        document.cookie =
                            "role=admin; domain=.cinnamonforest.com; path=/; max-age=86400; SameSite=Lax";

                        window.open(item.link, "_blank");
                    }}
                >
                    {inner}
                </button>
            );
        return <Link key={item.label} to={item.link}>{inner}</Link>;
    };

    const SidebarBody = ({ compact }: { compact: boolean }) => (
        <>
            <div className="px-4 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className={`flex items-center ${compact ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        {!compact && (
                            <>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: "#8B1A38" }}>
                                    <Sparkles size={14} className="text-white" />
                                </div>
                                <span className="text-white font-bold text-[15px] tracking-tight">Cinnamon</span>
                            </>
                        )}
                    </div>
                    {/* Desktop collapse button only */}
                    <button
                        onClick={() => setCollapsed(v => !v)}
                        className="bg-transparent border-none cursor-pointer text-white hidden md:inline-flex"
                    >
                        {compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="bg-transparent border-none cursor-pointer text-white md:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <nav className="flex-1 py-4 px-3 overflow-y-auto">
                <p className="text-[10px] font-semibold tracking-widest uppercase px-2 mb-2"
                    style={{ color: "rgba(255,255,255,0.35)" }}>Menu</p>
                {SIDEBAR_ITEMS.map(item => renderNavItem(item, compact))}
            </nav>

            <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ backgroundColor: "#8B1A38" }}>A</div>
                    {!compact && (
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-white font-medium truncate">Admin</p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>Quản trị viên</p>
                        </div>
                    )}
                    {!compact && <Settings size={13} style={{ color: "rgba(255,255,255,0.4)" }} />}
                </div>
            </div>
        </>
    );

    return (
        <div className="flex bg-background text-foreground" style={{ fontFamily: "system-ui, sans-serif" }}>
            {/* Desktop sidebar */}
            <aside
                className={`${collapsed ? "w-16" : "w-56"} shrink-0 hidden md:flex flex-col bg-sidebar transition-all duration-300`}
                style={{ height: "100vh", position: "sticky", top: 0, overflow: "hidden" }}
            >
                <SidebarBody compact={collapsed} />
            </aside>

            {/* Mobile drawer + overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col md:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <SidebarBody compact={false} />
            </aside>

            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                <header
                    className="flex items-center justify-between gap-3 px-4 md:px-8 py-3 md:py-4 bg-background border-b border-border shrink-0"
                    style={{ position: "sticky", top: 0, zIndex: 10 }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center bg-muted hover:bg-accent border-none cursor-pointer text-foreground"
                            aria-label="Mở menu"
                        >
                            <Menu size={18} />
                        </button>
                        <div className="flex items-center gap-2 text-[13px] text-muted-foreground min-w-0">
                            <span className="hidden sm:inline">Home</span>
                            <ChevronRight size={12} className="hidden sm:inline" />
                            <span className="font-medium text-primary truncate">{breadcrumb}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                            <Search size={13} className="text-muted-foreground" />
                            <span className="text-[12px] text-muted-foreground">Tìm kiếm...</span>
                        </div>
                        <ThemeMenu />
                        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-accent transition-colors border-none cursor-pointer text-muted-foreground">
                            <Bell size={15} />
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                style={{ backgroundColor: "#8B1A38" }}>A</div>
                            <span className="text-[13px] font-medium text-foreground">Admin</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
