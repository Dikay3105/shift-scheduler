import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import html2canvas from "html2canvas-pro";
import { Download, RotateCcw, Wand2, Copy, X, Plus } from "lucide-react";

export const Route = createFileRoute("/WorkHours")({
    head: () => ({
        meta: [
            { title: "Bảng tính giờ làm" },
            { name: "description", content: "Nhập giờ làm mỗi ngày theo tháng và xuất báo cáo" },
        ],
    }),
    component: WorkHoursPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
    _id: string;
    fullName: string;
    employeeCode: string;
    position: string;
}

type TimeRange = { start: string; end: string };

interface DayDoc {
    day: number;
    ranges: TimeRange[];
}

interface WorkHourDoc {
    _id?: string;
    employeeId: string;
    employeeName: string;
    month: number;
    year: number;
    days: DayDoc[];
}

const DAY_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function sumRanges(ranges: TimeRange[]): number {
    return ranges.reduce((s, r) => s + hoursBetween(r.start, r.end), 0);
}

function rangesLabel(ranges: TimeRange[]): string {
    const valid = ranges.filter(r => r.start && r.end);
    if (!valid.length) return "—";
    return valid.map(r => `${r.start}–${r.end}`).join(", ");
}

function formatHours(h: number): string {
    if (!h) return "";
    const whole = Math.floor(h);
    const min = Math.round((h - whole) * 60);
    if (min === 0) return `${whole} giờ`;
    return `${whole} giờ ${min}p`;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

// Chuyển entries (state trong UI) <-> days (định dạng lưu ở backend)
function daysDocToEntries(daysDoc: DayDoc[]): Record<number, TimeRange[]> {
    const map: Record<number, TimeRange[]> = {};
    for (const d of daysDoc) map[d.day] = d.ranges;
    return map;
}
function entriesToDaysDoc(entries: Record<number, TimeRange[]>): DayDoc[] {
    return Object.entries(entries)
        .map(([day, ranges]) => ({ day: Number(day), ranges: ranges.filter(r => r.start && r.end) }))
        .filter(d => d.ranges.length > 0);
}

function WorkHoursPage() {
    const now = new Date();

    // ── Employees (load từ API, giống TaskReport) ──
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeId, setEmployeeId] = useState<string>("");
    const [loadingEmployees, setLoadingEmployees] = useState(true);

    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [entries, setEntries] = useState<Record<number, TimeRange[]>>({});
    const [loadingHours, setLoadingHours] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Tránh việc load dữ liệu xong lại tự trigger lưu ngay
    const skipNextSaveRef = useRef(false);

    useEffect(() => {
        fetch(`${API_BASE}/employees`)
            .then(r => r.json())
            .then(d => {
                const list: Employee[] = (d.data || []).filter((e: Employee) => e.position === "Quản lý");
                setEmployees(list);
                if (list.length > 0) setEmployeeId(list[0]._id);
            })
            .catch(console.error)
            .finally(() => setLoadingEmployees(false));
    }, []);

    // ── Load work hours khi đổi nhân viên / tháng / năm ──
    const loadWorkHour = useCallback(() => {
        if (!employeeId) return;
        setLoadingHours(true);
        fetch(`${API_BASE}/work-hours?employeeId=${employeeId}&month=${month}&year=${year}`)
            .then(r => r.json())
            .then(d => {
                const doc: WorkHourDoc | null = d.data;
                skipNextSaveRef.current = true;
                setEntries(doc ? daysDocToEntries(doc.days) : {});
            })
            .catch(console.error)
            .finally(() => setLoadingHours(false));
    }, [employeeId, month, year]);

    useEffect(() => { loadWorkHour(); }, [loadWorkHour]);

    // ── Lưu (debounce) mỗi khi entries đổi ──
    useEffect(() => {
        if (!employeeId) return;
        if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }

        const timer = setTimeout(() => {
            fetch(`${API_BASE}/work-hours/upsert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId, month, year,
                    days: entriesToDaysDoc(entries),
                }),
            }).catch(console.error);
        }, 700);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, employeeId, month, year]);

    const totalDays = daysInMonth(year, month);
    const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

    const rows = days.map((d) => {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        const ranges = entries[d] || [];
        const hours = sumRanges(ranges);
        return { day: d, dow, ranges, hours, isSunday: dow === 0 };
    });

    const workDays = rows.filter(r => r.hours > 0).length;
    const totalHours = rows.reduce((s, r) => s + r.hours, 0);
    const avg = workDays ? totalHours / workDays : 0;

    // ── Sửa từng khoảng giờ ──
    const addRange = (day: number) => {
        setEntries(prev => ({ ...prev, [day]: [...(prev[day] || []), { start: "", end: "" }] }));
    };
    const updateRange = (day: number, idx: number, field: "start" | "end", value: string) => {
        setEntries(prev => {
            const ranges = [...(prev[day] || [])];
            ranges[idx] = { ...ranges[idx], [field]: value };
            return { ...prev, [day]: ranges };
        });
    };
    const removeRange = (day: number, idx: number) => {
        setEntries(prev => {
            const ranges = (prev[day] || []).filter((_, i) => i !== idx);
            return { ...prev, [day]: ranges };
        });
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

    // ── Bulk apply ──
    const [bulkStart, setBulkStart] = useState("10:00");
    const [bulkEnd, setBulkEnd] = useState("18:00");
    const [selectedDows, setSelectedDows] = useState<number[]>([1, 2, 3, 4, 5]); // mặc định T2–T6
    const [emptyOnly, setEmptyOnly] = useState(false);
    const [appendMode, setAppendMode] = useState(false); // true = thêm vào khoảng giờ đã có (ca gãy)

    const toggleDow = (dow: number) => {
        setSelectedDows(prev =>
            prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow].sort()
        );
    };

    const applyBulk = () => {
        if (selectedDows.length === 0) {
            alert("Vui lòng chọn ít nhất 1 thứ trong tuần.");
            return;
        }
        setEntries(prev => {
            const next = { ...prev };
            for (const d of days) {
                const dow = new Date(year, month - 1, d).getDay();
                if (!selectedDows.includes(dow)) continue;
                const existing = prev[d] || [];
                if (emptyOnly && existing.length > 0) continue;
                const newRange = { start: bulkStart, end: bulkEnd };
                next[d] = appendMode ? [...existing, newRange] : [newRange];
            }
            return next;
        });
    };

    const copyFromFirst = () => {
        const firstDay = Object.keys(entries).map(Number).sort((a, b) => a - b)
            .find(d => (entries[d] || []).some(r => r.start && r.end));
        if (!firstDay) { alert("Chưa có ngày nào có giờ để copy."); return; }
        const src = entries[firstDay];
        if (!confirm(`Copy ${rangesLabel(src)} (ngày ${pad(firstDay)}) sang TẤT CẢ các ngày?`)) return;
        setEntries(() => {
            const next: Record<number, TimeRange[]> = {};
            for (const d of days) next[d] = src.map(r => ({ ...r }));
            return next;
        });
    };

    const exportPNG = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { backgroundColor: "#ffffff", scale: 2 });
        const link = document.createElement("a");
        const emp = employees.find(e => e._id === employeeId);
        link.download = `BangGioLam_${emp?.fullName?.replace(/\s+/g, "-") ?? "NhanVien"}_${pad(month)}-${year}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const exportDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const activeEmployee = employees.find(e => e._id === employeeId);

    return (
        <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Bảng tính giờ làm</h1>
                <p className="text-sm text-muted-foreground mt-1">Nhập giờ làm mỗi ngày theo tháng và xuất báo cáo</p>
            </div>

            {/* Inputs */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nhân viên</label>
                    <select
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        disabled={loadingEmployees || employees.length === 0}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-primary disabled:opacity-60"
                    >
                        {loadingEmployees && <option>Đang tải…</option>}
                        {!loadingEmployees && employees.length === 0 && <option>Không có nhân viên</option>}
                        {employees.map(e => (
                            <option key={e._id} value={e._id}>
                                {e.fullName}{e.employeeCode ? ` (${e.employeeCode})` : ""}
                            </option>
                        ))}
                    </select>
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

            {/* Bulk apply */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Wand2 size={15} className="text-[#8B1A38]" />
                    <h2 className="text-sm font-semibold">Áp dụng hàng loạt</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Giờ làm</label>
                        <input type="time" value={bulkStart} onChange={e => setBulkStart(e.target.value)}
                            className="w-full px-2 py-2 rounded-lg bg-background border border-border text-sm" />
                    </div>
                    <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Giờ về</label>
                        <input type="time" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)}
                            className="w-full px-2 py-2 rounded-lg bg-background border border-border text-sm" />
                    </div>
                    <button onClick={applyBulk}
                        className="self-end px-3 py-2 rounded-lg bg-[#8B1A38] text-white text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-1.5">
                        <Wand2 size={14} /> Áp dụng
                    </button>
                    <button onClick={copyFromFirst} title="Copy giờ từ ngày đầu tiên có dữ liệu sang tất cả"
                        className="self-end px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted flex items-center justify-center gap-1.5">
                        <Copy size={14} /> Copy tất cả
                    </button>
                </div>

                <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block">Áp dụng cho các thứ (chọn tùy ý)</label>
                    <div className="flex flex-wrap gap-1.5">
                        {DAY_NAMES.map((name, dow) => {
                            const active = selectedDows.includes(dow);
                            const short = dow === 0 ? "CN" : `T${dow + 1}`;
                            return (
                                <button
                                    key={dow}
                                    type="button"
                                    onClick={() => toggleDow(dow)}
                                    title={name}
                                    className={`w-10 h-9 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${active
                                        ? "bg-[#8B1A38] text-white border-[#8B1A38]"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                        }`}
                                >
                                    {short}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <button type="button" onClick={() => setSelectedDows([1, 2, 3, 4, 5])}
                            className="text-[11px] px-2.5 py-1 rounded-md border border-border hover:bg-muted cursor-pointer">
                            T2–T6
                        </button>
                        <button type="button" onClick={() => setSelectedDows([0, 6])}
                            className="text-[11px] px-2.5 py-1 rounded-md border border-border hover:bg-muted cursor-pointer">
                            T7 + CN
                        </button>
                        <button type="button" onClick={() => setSelectedDows([0, 1, 2, 3, 4, 5, 6])}
                            className="text-[11px] px-2.5 py-1 rounded-md border border-border hover:bg-muted cursor-pointer">
                            Tất cả
                        </button>
                        <button type="button" onClick={() => setSelectedDows([])}
                            className="text-[11px] px-2.5 py-1 rounded-md border border-border hover:bg-muted cursor-pointer">
                            Bỏ chọn
                        </button>

                        <span className="w-px h-4 bg-border mx-1" />

                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={emptyOnly} onChange={e => setEmptyOnly(e.target.checked)}
                                className="accent-[#8B1A38]" />
                            Chỉ áp dụng cho ngày còn trống
                        </label>

                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={appendMode} onChange={e => setAppendMode(e.target.checked)}
                                className="accent-[#8B1A38]" />
                            Thêm vào (giữ khoảng giờ cũ — dùng cho ca gãy)
                        </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                        Mẹo cho ca gãy (VD 10h–14h và 17h–22h): Áp dụng 10:00–14:00 trước, sau đó tick "Thêm vào" và áp dụng tiếp 17:00–22:00.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/40">
                        <h2 className="text-sm font-semibold">
                            Nhập giờ ({workDays} ngày · {formatHours(totalHours) || "0 giờ"})
                            {loadingHours && <span className="text-muted-foreground font-normal"> · Đang tải…</span>}
                        </h2>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30 sticky top-0">
                                <tr className="text-xs text-muted-foreground">
                                    <th className="text-left px-3 py-2">Ngày</th>
                                    <th className="text-left px-3 py-2">Thứ</th>
                                    <th className="text-left px-3 py-2">Khoảng giờ</th>
                                    <th className="text-right px-3 py-2">Tổng</th>
                                    <th className="px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.day} className={`border-t border-border align-top ${r.isSunday ? "bg-[#8B1A38]/5" : ""}`}>
                                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{pad(r.day)}/{pad(month)}</td>
                                        <td className="px-3 py-2 text-xs whitespace-nowrap">{DAY_NAMES[r.dow]}</td>
                                        <td className="px-2 py-2">
                                            <div className="flex flex-col gap-1.5">
                                                {r.ranges.map((rg, idx) => (
                                                    <div key={idx} className="flex items-center gap-1">
                                                        <input type="time" value={rg.start}
                                                            onChange={e => updateRange(r.day, idx, "start", e.target.value)}
                                                            className="w-[92px] px-1.5 py-1 rounded bg-background border border-border text-xs" />
                                                        <span className="text-muted-foreground text-xs">–</span>
                                                        <input type="time" value={rg.end}
                                                            onChange={e => updateRange(r.day, idx, "end", e.target.value)}
                                                            className="w-[92px] px-1.5 py-1 rounded bg-background border border-border text-xs" />
                                                        <button onClick={() => removeRange(r.day, idx)} title="Xóa khoảng giờ này"
                                                            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-[#8B1A38] hover:bg-muted border-none bg-transparent cursor-pointer">
                                                            <X size={11} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addRange(r.day)}
                                                    className="flex items-center gap-1 text-[11px] text-[#8B1A38] font-medium hover:underline self-start border-none bg-transparent cursor-pointer px-0">
                                                    <Plus size={11} /> Thêm khoảng giờ
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-semibold text-[#8B1A38] whitespace-nowrap">
                                            {r.hours > 0 ? formatHours(r.hours) : "—"}
                                        </td>
                                        <td className="px-2 py-2">
                                            <button onClick={() => clearDay(r.day)} title="Xóa cả ngày này"
                                                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-[#8B1A38] hover:bg-muted border-none bg-transparent cursor-pointer">
                                                <X size={13} />
                                            </button>
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
                                Nhân viên: <b>{activeEmployee?.fullName || "—"}</b>
                            </div>
                        </div>

                        <div style={{ padding: 16 }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#f7e5e4", color: "#8B1A38" }}>
                                        <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700, fontSize: 11 }}>NGÀY</th>
                                        <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700, fontSize: 11 }}>THỨ</th>
                                        <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700, fontSize: 11 }}>KHOẢNG GIỜ</th>
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
                                            <td style={{ padding: "7px 6px", borderBottom: "1px solid #f2e6e5" }}>{rangesLabel(r.ranges)}</td>
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