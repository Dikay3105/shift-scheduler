import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import { Download, RotateCcw, Wand2, Copy, X } from "lucide-react";

export const Route = createFileRoute("/WorkHours")({
    head: () => ({
        meta: [
            { title: "Bảng tính giờ làm" },
            { name: "description", content: "Nhập giờ làm mỗi ngày theo tháng và xuất báo cáo" },
        ],
    }),
    component: WorkHoursPage,
});

type DayEntry = { start: string; end: string };
const DAY_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function hoursBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins / 60;
}

function formatHours(h: number): string {
    if (!h) return "";
    const whole = Math.floor(h);
    const min = Math.round((h - whole) * 60);
    if (min === 0) return `${whole} giờ`;
    return `${whole} giờ ${min}p`;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function WorkHoursPage() {
    const now = new Date();
    const [employee, setEmployee] = useState("");
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [entries, setEntries] = useState<Record<number, DayEntry>>({});
    const reportRef = useRef<HTMLDivElement>(null);

    const storageKey = `workhours:${year}-${month}:${employee.trim().toLowerCase()}`;

    // Load from localStorage when key changes
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            setEntries(raw ? JSON.parse(raw) : {});
        } catch { setEntries({}); }
    }, [storageKey]);

    // Persist
    useEffect(() => {
        if (!employee.trim()) return;
        localStorage.setItem(storageKey, JSON.stringify(entries));
    }, [entries, storageKey, employee]);

    const totalDays = daysInMonth(year, month);
    const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

    const rows = days.map((d) => {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        const e = entries[d] || { start: "", end: "" };
        const h = hoursBetween(e.start, e.end);
        return { day: d, dow, start: e.start, end: e.end, hours: h, isSunday: dow === 0 };
    });

    const workDays = rows.filter(r => r.hours > 0).length;
    const totalHours = rows.reduce((s, r) => s + r.hours, 0);
    const avg = workDays ? totalHours / workDays : 0;

    const updateEntry = (day: number, field: "start" | "end", value: string) => {
        setEntries(prev => ({ ...prev, [day]: { ...(prev[day] || { start: "", end: "" }), [field]: value } }));
    };

    const clearDay = (day: number) => {
        setEntries(prev => {
            const n = { ...prev }; delete n[day]; return n;
        });
    };

    const clearAll = () => {
        if (!confirm("Xóa toàn bộ dữ liệu tháng này?")) return;
        setEntries({});
    };

    // Bulk apply
    type Scope = "all" | "empty" | "weekday" | "weekend" | "sunday";
    const [bulkStart, setBulkStart] = useState("10:00");
    const [bulkEnd, setBulkEnd] = useState("18:00");
    const [bulkScope, setBulkScope] = useState<Scope>("all");

    const applyBulk = () => {
        const matches = (dow: number, day: number) => {
            if (bulkScope === "all") return true;
            if (bulkScope === "empty") return !entries[day]?.start && !entries[day]?.end;
            if (bulkScope === "weekday") return dow >= 1 && dow <= 5;
            if (bulkScope === "weekend") return dow === 0 || dow === 6;
            if (bulkScope === "sunday") return dow === 0;
            return false;
        };
        setEntries(prev => {
            const next = { ...prev };
            for (const d of days) {
                const dow = new Date(year, month - 1, d).getDay();
                if (matches(dow, d)) next[d] = { start: bulkStart, end: bulkEnd };
            }
            return next;
        });
    };

    const copyFromFirst = () => {
        const firstDay = Object.keys(entries).map(Number).sort((a, b) => a - b)
            .find(d => entries[d]?.start && entries[d]?.end);
        if (!firstDay) { alert("Chưa có ngày nào có giờ để copy."); return; }
        const src = entries[firstDay];
        if (!confirm(`Copy ${src.start}–${src.end} (ngày ${pad(firstDay)}) sang TẤT CẢ các ngày?`)) return;
        setEntries(() => {
            const next: Record<number, DayEntry> = {};
            for (const d of days) next[d] = { ...src };
            return next;
        });
    };

    const exportPNG = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { backgroundColor: "#ffffff", scale: 2 });
        const link = document.createElement("a");
        link.download = `BangGioLam_${employee || "NhanVien"}_${pad(month)}-${year}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const exportDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    return (
        <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Bảng tính giờ làm</h1>
                <p className="text-sm text-muted-foreground mt-1">Nhập giờ làm mỗi ngày theo tháng và xuất báo cáo</p>
            </div>

            {/* Inputs */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên nhân viên</label>
                    <input
                        value={employee}
                        onChange={e => setEmployee(e.target.value)}
                        placeholder="VD: Đoàn Chấn Nghiệp"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tháng</label>
                    <select value={month} onChange={e => setMonth(+e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Năm</label>
                    <input type="number" value={year} onChange={e => setYear(+e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex items-end gap-2">
                    <button onClick={exportPNG}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#8B1A38] text-white text-sm font-semibold hover:opacity-90">
                        <Download size={15} /> Xuất PNG
                    </button>
                    <button onClick={clearAll} title="Xóa dữ liệu tháng"
                        className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/40">
                        <h2 className="text-sm font-semibold">Nhập giờ ({workDays} ngày · {formatHours(totalHours) || "0 giờ"})</h2>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30 sticky top-0">
                                <tr className="text-xs text-muted-foreground">
                                    <th className="text-left px-3 py-2">Ngày</th>
                                    <th className="text-left px-3 py-2">Thứ</th>
                                    <th className="text-left px-3 py-2">Giờ làm</th>
                                    <th className="text-left px-3 py-2">Giờ về</th>
                                    <th className="text-right px-3 py-2">Tổng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.day} className={`border-t border-border ${r.isSunday ? "bg-[#8B1A38]/5" : ""}`}>
                                        <td className="px-3 py-1.5 font-mono text-xs">{pad(r.day)}/{pad(month)}</td>
                                        <td className="px-3 py-1.5 text-xs">{DAY_NAMES[r.dow]}</td>
                                        <td className="px-2 py-1">
                                            <input type="time" value={r.start}
                                                onChange={e => updateEntry(r.day, "start", e.target.value)}
                                                className="w-full px-2 py-1 rounded bg-background border border-border text-xs" />
                                        </td>
                                        <td className="px-2 py-1">
                                            <input type="time" value={r.end}
                                                onChange={e => updateEntry(r.day, "end", e.target.value)}
                                                className="w-full px-2 py-1 rounded bg-background border border-border text-xs" />
                                        </td>
                                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-[#8B1A38]">
                                            {r.hours > 0 ? formatHours(r.hours) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Report preview */}
                <div className="bg-muted/20 border border-border rounded-2xl p-4">
                    <div className="text-xs text-muted-foreground mb-2">Xem trước báo cáo</div>
                    <div ref={reportRef} style={{ background: "#ffffff", color: "#111", fontFamily: "system-ui, sans-serif", padding: 0, borderRadius: 12, overflow: "hidden", maxWidth: 560, margin: "0 auto" }}>
                        <div style={{ background: "#8B1A38", color: "#fff", padding: "18px 22px" }}>
                            <div style={{ fontSize: 11, letterSpacing: 4, opacity: 0.9 }}>CINNAMON FOREST</div>
                            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                                Bảng Tính Giờ Làm — Tháng {month}/{year}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 6, opacity: 0.95 }}>
                                Nhân viên: <b>{employee || "—"}</b>
                            </div>
                        </div>

                        <div style={{ padding: 16 }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#f7e5e4", color: "#8B1A38" }}>
                                        <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700, fontSize: 11 }}>NGÀY</th>
                                        <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700, fontSize: 11 }}>THỨ</th>
                                        <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, fontSize: 11 }}>GIỜ LÀM</th>
                                        <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, fontSize: 11 }}>GIỜ VỀ</th>
                                        <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, fontSize: 11 }}>TỔNG GIỜ LÀM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => (
                                        <tr key={r.day} style={{ background: r.isSunday ? "#fdecec" : "#fff", borderBottom: "1px solid #f0e4e3" }}>
                                            <td style={{ padding: "7px 6px", borderBottom: "1px solid #f2e6e5", color: r.isSunday ? "#8B1A38" : "#111", fontWeight: r.isSunday ? 600 : 400 }}>
                                                {pad(r.day)}/{pad(month)}/{year}
                                            </td>
                                            <td style={{ padding: "7px 6px", borderBottom: "1px solid #f2e6e5" }}>{DAY_NAMES[r.dow]}</td>
                                            <td style={{ padding: "7px 6px", borderBottom: "1px solid #f2e6e5", textAlign: "center" }}>{r.start || "—"}</td>
                                            <td style={{ padding: "7px 6px", borderBottom: "1px solid #f2e6e5", textAlign: "center" }}>{r.end || "—"}</td>
                                            <td style={{ padding: "7px 6px", borderBottom: "1px solid #f2e6e5", textAlign: "right", color: "#8B1A38", fontWeight: 700 }}>
                                                {r.hours > 0 ? formatHours(r.hours) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ background: "#8B1A38", color: "#fff", padding: "14px 22px", display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: 1 }}>TỔNG GIỜ LÀM</div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{formatHours(totalHours) || "0 giờ"}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: 1 }}>SỐ NGÀY LÀM</div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{workDays} / {totalDays} ngày</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: 1 }}>TRUNG BÌNH / NGÀY</div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{formatHours(avg) || "—"}</div>
                            </div>
                        </div>
                        <div style={{ padding: "8px 22px 12px", fontSize: 10, color: "#888", textAlign: "center" }}>
                            Xuất ngày {exportDate} — Cinnamon Forest
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
