import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Sparkles, RefreshCw, TrendingUp, Users, Clock } from "lucide-react";
import { io } from "socket.io-client";
import { socket } from "@/lib/socket";
import { scheduleApi } from "@/services/api";
import { aiPostApi } from "@/services/aiPostApi";

export const Route = createFileRoute("/")({
    component: DashboardContent,
});

// Socket singleton — khởi tạo 1 lần duy nhất


export function useOnlineCount() {
    const [count, setCount] = useState<number>(0);

    useEffect(() => {
        const handler = (n: number) => setCount(n);
        socket.on("onlineCount", handler);

        // Nếu socket đã connected rồi thì request count ngay,
        // vì "onlineCount" event đã bị bỏ lỡ lúc connect
        if (socket.connected) {
            socket.emit("requestOnlineCount");
        } else {
            socket.once("connect", () => {
                socket.emit("requestOnlineCount");
            });
        }

        return () => { socket.off("onlineCount", handler); };
    }, []);

    return count;
}

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

type StatCardData = {
    value: string;
    label: string;
    icon: React.ElementType;
    color: string;
    light: string;
    live?: boolean;
};

function StatCard({ card }: { card: StatCardData }) {
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
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-white leading-none">{card.value}</p>
                        {card.live && (
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="text-[10px] text-white/70">live</span>
                            </span>
                        )}
                    </div>
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

function DashboardContent() {
    const [activeTab, setActiveTab] = useState<"day" | "month" | "year">("month");
    const onlineCount = useOnlineCount();
    const [postsThisMonth, setPostsThisMonth] = useState<number>(0);
    const [totalEmployees, setTotalEmployees] = useState<number>(0);
    const [scheduledPosts, setScheduledPosts] = useState<number>(0);

    useEffect(() => {
        // Ca làm hôm nay
        const today = new Date().toISOString().split("T")[0];


        aiPostApi.getPosts({ status: "scheduled", limit: 100 })
            .then(r => setScheduledPosts(r.pagination?.total ?? 0))
            .catch(() => { });

        // Tổng nhân viên
        scheduleApi.getEmployees()
            .then(r => setTotalEmployees(r.data?.length ?? 0))
            .catch(() => { });

        // Bài đăng tháng này — lấy tất cả rồi filter
        aiPostApi.getPosts({ limit: 100 })
            .then(r => {
                const now = new Date();
                const thisMonth = (r.data ?? []).filter((p: any) => {
                    const d = new Date(p.createdAt);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                setPostsThisMonth(thisMonth.length);
            })
            .catch(() => { });
    }, []);

    const STAT_CARDS: StatCardData[] = [
        {
            value: String(onlineCount),
            label: "Đang truy cập",
            icon: Users,
            color: "#4ad970",
            light: "#5be891",
            live: true,
        },
        {
            value: String(totalEmployees),
            label: "Tổng nhân viên",
            icon: TrendingUp,
            color: "#E85D5D",
            light: "#F07070",
        },
        {
            value: String(postsThisMonth),
            label: "Bài đăng tháng này",
            icon: Sparkles,
            color: "#F5A623",
            light: "#FFBA3A",
        },
        {
            value: String(scheduledPosts), label: "Bài chờ đăng", icon: Clock, color: "#50C4B0",
            light: "#62D4C0",
        },
        ,
    ];

    return (
        <div className="p-6">
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