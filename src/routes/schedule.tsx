import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { EmployeeCardPrintable } from "@/components/schedule/EmployeeCardPrintable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { IdCard } from "lucide-react";
import {
  startOfISOWeek,
  addDays,
  getISOWeek,
  formatDateKey,
  pad2,
  DAY_NAMES,
} from "@/lib/date-utils";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EmployeeManagerModal } from "@/components/schedule/EmployeeManagerModal";
import { ShiftManagerModal } from "@/components/schedule/ShiftManagerModal";
import { ShiftPickerModal } from "@/components/schedule/ShiftPickerModal";

import {
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Trash2,
  CalendarDays,
  Search,
  FileSpreadsheet,
  FileText,
  ImageDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminHeader from "@/components/AdminHeader";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const {
    state,
    hydrated,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addShift,
    updateShift,
    deleteShift,
    setAssignment,
    clearWeek,
  } = useSchedule();

  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addDays(startOfISOWeek(today), weekOffset * 7),
    [today, weekOffset]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const dayKeys = useMemo(() => days.map(formatDateKey), [days]);
  const { week, year } = getISOWeek(weekStart);
  const todayKey = formatDateKey(today);

  const [empOpen, setEmpOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [picker, setPicker] = useState<{ empId: string; dateKey: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardFormat, setCardFormat] = useState<"pdf" | "png-zip" | "png-sheet">("pdf");

  // Distinct color palette for shifts (overrides API color when duplicated/missing)
  const SHIFT_PALETTE = [
    { bg: "#fde68a", fg: "#78350f" }, // amber
    { bg: "#bfdbfe", fg: "#1e3a8a" }, // blue
    { bg: "#bbf7d0", fg: "#14532d" }, // green
    { bg: "#fecaca", fg: "#7f1d1d" }, // red
    { bg: "#ddd6fe", fg: "#4c1d95" }, // violet
    { bg: "#fbcfe8", fg: "#831843" }, // pink
    { bg: "#a5f3fc", fg: "#155e75" }, // cyan
    { bg: "#fed7aa", fg: "#7c2d12" }, // orange
    { bg: "#d9f99d", fg: "#365314" }, // lime
    { bg: "#e9d5ff", fg: "#581c87" }, // purple
  ];
  const coloredShifts = useMemo(() => {
    return state.shifts.map((s, i) => {
      const p = SHIFT_PALETTE[i % SHIFT_PALETTE.length];
      return { ...s, bg: p.bg, fg: p.fg };
    });
  }, [state.shifts]);
  const shiftById = useMemo(() => {
    const m = new Map<string, (typeof coloredShifts)[number]>();
    coloredShifts.forEach((s) => m.set(s.id, s));
    return m;
  }, [coloredShifts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchInput.trim();
    if (!raw) return;
    const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
    if (!m) {
      setSearchError("Định dạng: DD/MM hoặc DD/MM/YYYY");
      return;
    }
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let yr = m[3] ? parseInt(m[3], 10) : today.getFullYear();
    if (yr < 100) yr += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      setSearchError("Ngày hoặc tháng không hợp lệ");
      return;
    }
    const target = new Date(yr, month - 1, day);
    if (target.getMonth() !== month - 1 || target.getDate() !== day) {
      setSearchError("Ngày không tồn tại");
      return;
    }
    const todayWeekStart = startOfISOWeek(today);
    const targetWeekStart = startOfISOWeek(target);
    const diffWeeks = Math.round(
      (targetWeekStart.getTime() - todayWeekStart.getTime()) / (7 * 86400000)
    );
    setWeekOffset(diffWeeks);
    setSearchError(null);
  };

  const fileBase = `lich-lam-viec-tuan-${week}-${year}`;

  const exportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const header = ["Nhân viên", "Chức vụ", ...days.map((d, i) => `${DAY_NAMES[i]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`)];
      const rows = state.employees.map((emp) => {
        const cells = dayKeys.map((dk) => {
          const sid = state.assignments[`${emp.id}|${dk}`];
          const sh = sid ? state.shifts.find((s) => s.id === sid) : null;
          return sh ? `${sh.code} (${sh.start}-${sh.end})` : "";
        });
        return [emp.name, emp.role || "", ...cells];
      });
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      ws["!cols"] = [{ wch: 22 }, { wch: 14 }, ...days.map(() => ({ wch: 18 }))];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Tuần ${week}`);
      XLSX.writeFile(wb, `${fileBase}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const exportImage = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${fileBase}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min((pw - 40) / canvas.width, (ph - 40) / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(img, "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
      pdf.save(`${fileBase}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  const pickerEmp = picker ? state.employees.find((e) => e.id === picker.empId) : null;
  const pickerDay = picker ? days[dayKeys.indexOf(picker.dateKey)] : null;
  const pickerCurrent = picker ? state.assignments[`${picker.empId}|${picker.dateKey}`] ?? null : null;

  const subtitle = `Tuần từ ${pad2(days[0].getDate())}/${pad2(days[0].getMonth() + 1)} – ${pad2(days[6].getDate())}/${pad2(days[6].getMonth() + 1)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-purple-50">
      <AdminHeader title="Schedule Management" description="Quản lý lịch làm việc của nhân viên" backTo="/" />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* HERO HEADER */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium backdrop-blur">
                <CalendarDays className="h-3.5 w-3.5" />
                Tuần {week} · {year}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Lịch Làm Việc</h1>
              <p className="mt-1 text-sm text-white/80">{subtitle} · Nhấn vào ô để chỉnh sửa</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form onSubmit={handleSearch} className="flex items-start gap-2">
                <div className="flex flex-col">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                    <Input
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        if (searchError) setSearchError(null);
                      }}
                      placeholder="DD/MM hoặc DD/MM/YYYY"
                      className="h-9 w-[210px] border-white/30 bg-white/15 pl-8 text-sm text-white placeholder:text-white/60 focus-visible:ring-white/50"
                    />
                  </div>
                  {searchError && (
                    <span className="mt-1 text-[11px] text-amber-200">{searchError}</span>
                  )}
                </div>
                <Button type="submit" size="sm" className="h-9 bg-white text-indigo-700 hover:bg-white/90">
                  Tìm tuần
                </Button>
              </form>

              <div className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 p-1 backdrop-blur">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white hover:bg-white/20 hover:text-white" onClick={() => setWeekOffset((o) => o - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button onClick={() => setWeekOffset(0)} className="px-2 text-xs font-semibold text-white hover:text-white/80">
                  Tuần này
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white hover:bg-white/20 hover:text-white" onClick={() => setWeekOffset((o) => o + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="relative mt-5 flex flex-wrap items-center gap-2">
            <Button size="sm" className="bg-white/15 text-white hover:bg-white/25 border border-white/20" onClick={() => setEmpOpen(true)}>
              <Users className="mr-1.5 h-4 w-4" /> Nhân viên
            </Button>
            <Button size="sm" className="bg-white/15 text-white hover:bg-white/25 border border-white/20" onClick={() => setShiftOpen(true)}>
              <Clock className="mr-1.5 h-4 w-4" /> Ca làm
            </Button>
            <Button size="sm" className="bg-white/15 text-white hover:bg-white/25 border border-white/20" onClick={() => setConfirmClear(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Xóa tuần
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" onClick={exportExcel} disabled={exporting} className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-md">
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
              </Button>
              <Button size="sm" onClick={exportPdf} disabled={exporting} className="bg-rose-500 text-white hover:bg-rose-600 shadow-md">
                <FileText className="mr-1.5 h-4 w-4" /> PDF
              </Button>
              <Button size="sm" onClick={exportImage} disabled={exporting} className="bg-sky-500 text-white hover:bg-sky-600 shadow-md">
                <ImageDown className="mr-1.5 h-4 w-4" /> Ảnh
              </Button>
            </div>
          </div>
        </div>

        {/* TABLE CARD */}
        <div ref={tableRef} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="min-w-[200px] border-r border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-4 pl-5 text-left text-xs font-semibold uppercase tracking-wider text-white/90">
                    Nhân viên
                  </th>
                  {days.map((d, i) => {
                    const isWeekend = i >= 5;
                    const isToday = formatDateKey(d) === todayKey;
                    return (
                      <th
                        key={i}
                        className={`border-r border-white/10 p-3 text-center text-xs font-semibold last:border-r-0 ${
                          isWeekend
                            ? "bg-gradient-to-br from-amber-600 to-orange-700 text-white"
                            : "bg-gradient-to-br from-slate-900 to-slate-800 text-white/90"
                        } ${isToday ? "ring-2 ring-inset ring-yellow-300" : ""}`}
                      >
                        <div className="text-[12px] font-bold uppercase tracking-wider">{DAY_NAMES[i]}</div>
                        <div className={`mt-1 text-lg font-bold ${isToday ? "text-yellow-200" : ""}`}>
                          {pad2(d.getDate())}/{pad2(d.getMonth() + 1)}
                        </div>
                        {isToday && <div className="mt-0.5 text-[9px] font-semibold text-yellow-200">HÔM NAY</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {state.employees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={`border-b border-border/50 last:border-b-0 transition-colors hover:bg-indigo-50/40 ${
                      idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                    }`}
                  >
                    <td className="border-r border-border/50 px-5 py-3 text-left">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-2 ring-white"
                          style={{ background: emp.color }}
                        >
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{emp.name}</div>
                          {emp.role && (
                            <div className="truncate text-[11px] font-medium text-indigo-600">{emp.role}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {dayKeys.map((dk, i) => {
                      const isWeekend = i >= 5;
                      const isToday = dk === todayKey;
                      const shiftId = state.assignments[`${emp.id}|${dk}`];
                      const shift = shiftId ? state.shifts.find((s) => s.id === shiftId) : null;

                      return (
                        <td
                          key={dk}
                          className={`border-r border-border/50 p-2 text-center last:border-r-0 ${
                            isToday ? "bg-yellow-50/60" : isWeekend ? "bg-orange-50/40" : ""
                          }`}
                        >
                          {shift ? (
                            <button
                              onClick={() => setPicker({ empId: emp.id, dateKey: dk })}
                              className="group inline-block min-w-[100px] rounded-xl border border-white/40 px-3 py-2.5 text-center font-medium shadow-md transition-all hover:scale-105 hover:shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${shift.bg}, ${shift.bg}dd)`,
                                color: shift.fg,
                              }}
                            >
                              <div className="text-sm font-extrabold uppercase tracking-wider drop-shadow-sm">
                                {shift.code}
                              </div>
                              <div className="mt-0.5 text-[10px] font-semibold opacity-90">
                                {shift.start} – {shift.end}
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={() => setPicker({ empId: emp.id, dateKey: dk })}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-border/70 text-muted-foreground transition-all hover:scale-110 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <span className="text-xl font-light">+</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {state.employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      Chưa có nhân viên. Bấm "Nhân viên" để thêm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LEGEND */}
        {state.shifts.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chú thích ca:</span>
            {state.shifts.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-3 py-1.5 text-xs font-semibold shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${s.bg}, ${s.bg}dd)`,
                  color: s.fg,
                }}
              >
                <span className="font-extrabold">{s.code}</span>
                <span className="text-[10px] opacity-90">{s.start}–{s.end}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <EmployeeManagerModal
        open={empOpen}
        onOpenChange={setEmpOpen}
        employees={state.employees}
        onAdd={addEmployee}
        onUpdate={updateEmployee}
        onDelete={deleteEmployee}
      />

      <ShiftManagerModal
        open={shiftOpen}
        onOpenChange={setShiftOpen}
        onAdd={addShift}
        onUpdate={updateShift}
        onDelete={deleteShift}
      />

      <ShiftPickerModal
        open={!!picker}
        onOpenChange={(v) => !v && setPicker(null)}
        currentShiftId={pickerCurrent}
        employeeName={pickerEmp?.name}
        dateLabel={
          pickerDay
            ? `${DAY_NAMES[dayKeys.indexOf(picker!.dateKey)]} ${pad2(pickerDay.getDate())}/${pad2(pickerDay.getMonth() + 1)}`
            : undefined
        }
        onSelect={(shiftId) => {
          if (picker) setAssignment(picker.empId, picker.dateKey, shiftId);
        }}
      />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tất cả ca trong tuần?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ phân ca của tuần {week}/{year} sẽ bị xóa. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearWeek(dayKeys)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
