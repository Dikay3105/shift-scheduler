import React, { useState } from "react";
import { Link, createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import {
    CalendarDays, UserCog, Image, Package2, ShieldCheck,
    Sparkles, LayoutDashboard, Settings, ChevronRight, RefreshCw,
    TrendingUp, Users, Bell, Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
    component: AdminLayout,
});

const SIDEBAR_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, link: "/" },
    { label: "Lịch làm việc", icon: CalendarDays, link: "/schedule" },
    { label: "Nội quy", icon: ShieldCheck, link: "/rule" },
    { label: "Quản lý kho", icon: Package2, link: "https://inventory.cinnamonforest.com/", external: true },
    { label: "Thẻ nhân viên", icon: UserCog, link: "/employeeCard" },
    { label: "Avatar", icon: Image, link: "/avatar" },
    { label: "Content AI", icon: Sparkles, link: "/aiPosts", badge: "AI" },
];

const STAT_CARDS = [
    { value: "24", label: "Nhân viên online", icon: Users, color: "#4A90D9", light: "#5BA3E8" },
    { value: "8", label: "Ca làm hôm nay", icon: CalendarDays, color: "#50C4B0", light: "#62D4C0" },
    { value: "142", label: "Bài đăng tháng này", icon: Sparkles, color: "#F5A623", light: "#FFBA3A" },
    { value: "98%", label: "Hệ thống ổn định", icon: TrendingUp, color: "#E85D5D", light: "#F07070" },
];

const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
const traffic1 = [80, 120, 95, 160, 130, 175, 145, 190, 155, 200, 170, 185];
const traffic2 = [60, 90, 75, 110, 100, 130, 115, 150, 125, 160, 140, 155];

function sparkline(data: number[], w: number, h: number) {
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => [
        (i / (data.length - 1)) * w,
        h - ((v - min) / range) * (h * 0.7) - h * 0.1,
    ]);
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

function TrafficChart() {
    const W = 700, H = 220, PAD = { t: 20, r: 20, b: 30, l: 40 };
    const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
    const maxV = 250;
    const toX = (i: number) => PAD.l + (i / (MONTHS.length - 1)) * iW;
    const toY = (v: number) => PAD.t + iH - (v / maxV) * iH;
    const line = (data: number[]) =>
        data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    const area = (data: number[]) =>
        line(data) + ` L${toX(data.length - 1)},${PAD.t + iH} L${PAD.l},${PAD.t + iH} Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
            <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#50C4B0" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#50C4B0" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A90D9" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#4A90D9" stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {[50, 100, 150, 200, 250].map(v => (
                <g key={v}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={toY(v)} y2={toY(v)} stroke="#e8edf2" strokeWidth="1" />
                    <text x={PAD.l - 8} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="#aab" fontFamily="system-ui">{v}</text>
                </g>
            ))}
            {MONTHS.map((m, i) => (
                <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#aab" fontFamily="system-ui">{m}</text>
            ))}
            <path d={area(traffic1)} fill="url(#g1)" />
            <path d={area(traffic2)} fill="url(#g2)" />
            <path d={line(traffic1)} fill="none" stroke="#50C4B0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={line(traffic2)} fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
            {[traffic1, traffic2].map((data, di) => (
                <circle key={di} cx={toX(data.length - 1)} cy={toY(data[data.length - 1])} r="4"
                    fill={di === 0 ? "#50C4B0" : "#4A90D9"} stroke="white" strokeWidth="2" />
            ))}
        </svg>
    );
}

function StatCard({ card }: { card: typeof STAT_CARDS[0] }) {
    const Icon = card.icon;
    const sp = card.color === "#4A90D9" || card.color === "#E85D5D"
        ? [40, 55, 45, 60, 52, 70, 58, 75, 65, 80]
        : [60, 50, 70, 55, 75, 60, 80, 65, 78, 70];
    return (
        <div className="relative rounded-xl overflow-hidden flex flex-col justify-between p-5"
            style={{ backgroundColor: card.color, minHeight: 140 }}>
            <div className="absolute inset-0 opacity-30"
                style={{ background: `linear-gradient(160deg, ${card.light} 0%, transparent 60%)` }} />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-3xl font-bold text-white leading-none">{card.value}</p>
                    <p className="text-[12px] text-white/80 mt-1">{card.label}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon size={15} className="text-white" />
                </div>
            </div>
            <div className="relative mt-3">
                <svg viewBox="0 0 100 40" style={{ width: "100%", height: 40, opacity: 0.6 }}>
                    <path d={sparkline(sp, 100, 40)} fill="none" stroke="white" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
}

// Dashboard page content
function DashboardContent() {
    const [activeTab, setActiveTab] = useState<"day" | "month" | "year">("month");
    return (
        <div>
            <div className="grid grid-cols-4 gap-5 mb-8">
                {STAT_CARDS.map(card => <StatCard key={card.label} card={card} />)}
            </div>
            <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #e8edf2" }}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-[17px] font-semibold" style={{ color: "#2c3e50" }}>Traffic</h2>
                        <p className="text-[12px] mt-0.5" style={{ color: "#aab" }}>Hoạt động theo tháng — 2025</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(["day", "month", "year"] as const).map(t => (
                            <button key={t} onClick={() => setActiveTab(t)}
                                className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                                style={{
                                    backgroundColor: activeTab === t ? "#4A90D9" : "#f0f3f8",
                                    color: activeTab === t ? "#fff" : "#889",
                                    border: "none", cursor: "pointer",
                                }}>
                                {t === "day" ? "Ngày" : t === "month" ? "Tháng" : "Năm"}
                            </button>
                        ))}
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: "#f0f3f8", border: "none", cursor: "pointer" }}>
                            <RefreshCw size={13} style={{ color: "#889" }} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-5 mb-2">
                    {[
                        { color: "#50C4B0", label: "Bài đăng", dashed: false },
                        { color: "#4A90D9", label: "Nhân viên active", dashed: true },
                    ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                            <svg width="20" height="10">
                                <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth="2"
                                    strokeDasharray={l.dashed ? "4 2" : undefined} />
                            </svg>
                            <span className="text-[11px]" style={{ color: "#889" }}>{l.label}</span>
                        </div>
                    ))}
                </div>
                <TrafficChart />
            </div>
        </div>
    );
}

function AdminLayout() {
    const location = useLocation();
    const currentPath = location.pathname;

    const breadcrumb = SIDEBAR_ITEMS.find(i => i.link === currentPath)?.label ?? "Dashboard";

    return (
        <div className="flex" style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f0f3f8" }}>

            {/* ── Sidebar sticky ── */}
            <aside
                className="w-56 shrink-0 flex flex-col"
                style={{
                    backgroundColor: "#2c3e50",
                    height: "100vh",
                    position: "sticky",
                    top: 0,
                    overflowY: "auto",
                }}
            >
                {/* Logo */}
                <div className="px-5 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: "#50C4B0" }}>
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-[15px] tracking-tight">Cinnamon</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3">
                    <p className="text-[10px] font-semibold tracking-widest uppercase px-2 mb-2"
                        style={{ color: "rgba(255,255,255,0.3)" }}>Menu</p>
                    {SIDEBAR_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.link === currentPath;
                        const inner = (
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 cursor-pointer"
                                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent" }}>
                                <Icon size={16} style={{ color: isActive ? "#50C4B0" : "rgba(255,255,255,0.45)" }} />
                                <span className="text-[13px] flex-1"
                                    style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.55)" }}>
                                    {item.label}
                                </span>
                                {item.badge && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: "#50C4B0", color: "#fff" }}>
                                        {item.badge}
                                    </span>
                                )}
                                {isActive && <ChevronRight size={12} style={{ color: "#50C4B0" }} />}
                            </div>
                        );
                        if (item.external) return (
                            <button key={item.label} type="button" className="w-full text-left"
                                onClick={() => window.open(item.link, "_blank")}>{inner}</button>
                        );
                        return <Link key={item.label} to={item.link}>{inner}</Link>;
                    })}
                </nav>

                {/* User */}
                <div className="px-4 py-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                            style={{ backgroundColor: "#50C4B0" }}>A</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-white font-medium truncate">Admin</p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Quản trị viên</p>
                        </div>
                        <Settings size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                    </div>
                </div>
            </aside>

            {/* ── Right column ── */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">

                {/* ── Header sticky ── */}
                <header
                    className="flex items-center justify-between px-8 py-4 bg-white shrink-0"
                    style={{
                        borderBottom: "1px solid #e8edf2",
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                    }}
                >
                    <div className="flex items-center gap-2 text-[13px]" style={{ color: "#aab" }}>
                        <span>Home</span>
                        <ChevronRight size={12} />
                        <span>Admin</span>
                        <ChevronRight size={12} />
                        <span className="font-medium" style={{ color: "#4A90D9" }}>{breadcrumb}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: "#f0f3f8" }}>
                            <Search size={13} style={{ color: "#aab" }} />
                            <span className="text-[12px]" style={{ color: "#aab" }}>Tìm kiếm...</span>
                        </div>
                        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: "#f0f3f8", border: "none", cursor: "pointer" }}>
                            <Bell size={15} style={{ color: "#778" }} />
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400" />
                        </button>
                        <div className="flex items-center gap-2 pl-3"
                            style={{ borderLeft: "1px solid #e8edf2" }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                style={{ backgroundColor: "#50C4B0" }}>A</div>
                            <span className="text-[13px] font-medium" style={{ color: "#2c3e50" }}>Admin</span>
                            <ChevronRight size={12} style={{ color: "#aab", transform: "rotate(90deg)" }} />
                        </div>
                    </div>
                </header>

                {/* ── Main content ── */}
                <main className="flex-1 p-8">
                    {/*
                        Nếu đang ở route "/" thì show dashboard content.
                        Các route con (schedule, aiPosts, ...) render qua <Outlet />.
                        Nếu dùng TanStack Router nested routes thì chỉ cần <Outlet /> ở đây.
                    */}
                    {currentPath === "/" ? <DashboardContent /> : <Outlet />}
                </main>
            </div>
        </div>
    );
}