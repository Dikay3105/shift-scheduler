import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { getShiftColor } from "@/lib/shift-colors";
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
  Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    copyWeek,
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
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceWeek, setCopySourceWeek] = useState<string>("");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const handleCopyWeek = async () => {
    setCopyError(null);
    const wn = parseInt(copySourceWeek, 10);
    if (!wn || wn < 1 || wn > 53) {
      setCopyError("Số tuần không hợp lệ (1-53)");
      return;
    }
    if (wn === week) {
      setCopyError("Tuần nguồn trùng với tuần hiện tại");
      return;
    }
    // Tính ngày bắt đầu của tuần nguồn trong cùng năm với tuần đang xem
    // Dùng ISO week: ngày 4/1 luôn thuộc tuần 1
    const jan4 = new Date(year, 0, 4);
    const jan4WeekStart = startOfISOWeek(jan4);
    const sourceWeekStart = addDays(jan4WeekStart, (wn - 1) * 7);
    const sourceKey = formatDateKey(sourceWeekStart);
    const targetKey = formatDateKey(weekStart);

    if (sourceKey === targetKey) {
      setCopyError("Tuần nguồn trùng với tuần hiện tại");
      return;
    }

    try {
      setCopying(true);
      await copyWeek(sourceKey, targetKey);
      setCopyOpen(false);
      setCopySourceWeek("");
    } catch (e) {
      console.error(e);
      setCopyError("Sao chép thất bại. Vui lòng thử lại.");
    } finally {
      setCopying(false);
    }
  };

  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const coloredShifts = useMemo(() => {
    return state.shifts.map((s, i) => {
      const p = getShiftColor(i);
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
          const sh = sid ? shiftById.get(sid) : null;
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

  const buildPrintHTML = () => {
    const headerCells = days.map((d, i) => {
      const isWeekend = i >= 5;
      const isToday = formatDateKey(d) === todayKey;
      const bg = isWeekend ? "#c2410c" : "#1e293b";
      const border = isToday ? "3px solid #fde047" : "1px solid rgba(255,255,255,0.1)";
      return `
      <th style="background:${bg};color:white;padding:12px 8px;text-align:center;
                 border-right:${border};min-width:120px;border-bottom:2px solid #334155;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
          ${DAY_NAMES[i]}
        </div>
        <div style="font-size:18px;font-weight:800;margin-top:4px;
                    ${isToday ? "color:#fde047;" : ""}">
          ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}
        </div>
        ${isToday ? '<div style="font-size:9px;font-weight:700;color:#fde047;margin-top:2px;">HÔM NAY</div>' : ""}
      </th>`;
    }).join("");

    const bodyRows = state.employees.map((emp, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const dataCells = dayKeys.map((dk, i) => {
        const isWeekend = i >= 5;
        const isToday = dk === todayKey;
        const cellBg = isToday ? "#fefce8" : isWeekend ? "#fff7ed" : "transparent";
        const shiftId = state.assignments[`${emp.id}|${dk}`];
        const shift = shiftId ? shiftById.get(shiftId) : null;

        const inner = shift
          ? `<div style="display:inline-block;min-width:100px;padding:8px 12px;border-radius:12px;
                      background:${shift.bg};color:${shift.fg};text-align:center;
                      box-shadow:0 2px 8px rgba(0,0,0,0.15);">
             <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">
               ${shift.code}
             </div>
             <div style="font-size:10px;font-weight:600;margin-top:2px;opacity:0.9;">
               ${shift.start} – ${shift.end}
             </div>
           </div>`
          : `<div style="width:36px;height:36px;border-radius:10px;border:2px dashed #cbd5e1;
                      display:inline-flex;align-items:center;justify-content:center;
                      color:#94a3b8;font-size:20px;line-height:1;">+</div>`;

        return `<td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;
                         padding:8px;text-align:center;background:${cellBg};">${inner}</td>`;
      }).join("");

      // Avatar với inline style hoàn toàn
      const avatarLetter = emp.name.charAt(0).toUpperCase();
      const empCell = `
      <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;
                 padding:12px 16px;background:${bg};min-width:180px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:50%;background:${emp.color};
                      color:white;font-size:14px;font-weight:700;display:flex;
                      align-items:center;justify-content:center;flex-shrink:0;
                      box-shadow:0 2px 6px rgba(0,0,0,0.2);">
            ${avatarLetter}
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#1e293b;">${emp.name}</div>
            ${emp.role ? `<div style="font-size:11px;color:#4f46e5;font-weight:500;">${emp.role}</div>` : ""}
          </div>
        </div>
      </td>`;

      return `<tr style="background:${bg};">${empCell}${dataCells}</tr>`;
    }).join("");

    return `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
                background:white;border-radius:16px;overflow:hidden;
                box-shadow:0 4px 24px rgba(0,0,0,0.1);">
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="background:#1e293b;color:white;padding:16px 20px;text-align:left;
                       min-width:180px;border-right:1px solid rgba(255,255,255,0.1);
                       border-bottom:2px solid #334155;font-size:11px;
                       text-transform:uppercase;letter-spacing:1px;">
              Nhân viên
            </th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  };

  // Render the table at a fixed desktop width so mobile capture isn't squashed.
  const captureTableCanvas = async () => {
    const { default: html2canvas } = await import("html2canvas-pro");

    const DESKTOP_WIDTH = 1280;
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:${DESKTOP_WIDTH}px;
                            background:#f1f5f9;padding:24px;box-sizing:border-box;z-index:-1;`;
    wrapper.innerHTML = buildPrintHTML();
    document.body.appendChild(wrapper);

    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: "#f1f5f9",
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: DESKTOP_WIDTH,
        windowWidth: DESKTOP_WIDTH,
      });
      return canvas;
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const exportImage = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await captureTableCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `${fileBase}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Image export failed:", err);
      alert("Xuất ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const canvas = await captureTableCanvas();
      if (!canvas) return;

      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const scale = availW / canvas.width;
      const fullHeightOnPdf = canvas.height * scale;

      if (fullHeightOnPdf <= availH) {
        const img = canvas.toDataURL("image/png");
        pdf.addImage(img, "PNG", margin, margin, availW, fullHeightOnPdf, undefined, "FAST");
      } else {
        const sliceHeightPx = Math.floor(availH / scale);
        let offsetY = 0;
        let pageIndex = 0;
        const sliceCanvas = document.createElement("canvas");
        const ctx = sliceCanvas.getContext("2d")!;
        sliceCanvas.width = canvas.width;

        while (offsetY < canvas.height) {
          const currentSliceH = Math.min(sliceHeightPx, canvas.height - offsetY);
          sliceCanvas.height = currentSliceH;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0, offsetY, canvas.width, currentSliceH,
            0, 0, canvas.width, currentSliceH
          );
          const sliceImg = sliceCanvas.toDataURL("image/png");
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(sliceImg, "PNG", margin, margin, availW, currentSliceH * scale, undefined, "FAST");
          offsetY += currentSliceH;
          pageIndex++;
        }
      }

      pdf.save(`${fileBase}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Xuất PDF thất bại. Vui lòng thử lại.");
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
            <Button size="sm" className="bg-white/15 text-white hover:bg-white/25 border border-white/20" onClick={() => { setCopyError(null); setCopyOpen(true); }}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy tuần
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
                  <th className="min-w-[200px] border-r border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-4 pl-5 text-center text-xs font-semibold uppercase tracking-wider text-white/90">
                    Nhân viên
                  </th>
                  {days.map((d, i) => {
                    const isWeekend = i >= 5;
                    const isToday = formatDateKey(d) === todayKey;
                    return (
                      <th
                        key={i}
                        className={`border-r border-white/10 p-3 text-center text-xs font-semibold last:border-r-0 ${isWeekend
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
                    className={`border-b border-border/50 last:border-b-0 transition-colors hover:bg-indigo-50/40 ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"
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
                      const shift = shiftId ? shiftById.get(shiftId) : null;

                      return (
                        <td
                          key={dk}
                          className={`border-r border-border/50 p-2 text-center last:border-r-0 ${isToday ? "bg-yellow-50/60" : isWeekend ? "bg-orange-50/40" : ""
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
            {coloredShifts.map((s) => (
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

      <Dialog open={copyOpen} onOpenChange={(v) => { if (!copying) setCopyOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" /> Copy lịch từ tuần khác
            </DialogTitle>
            <DialogDescription>
              Toàn bộ lịch tuần <b>{week}/{year}</b> sẽ bị thay thế bằng lịch của tuần bạn chọn (trong năm {year}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="copy-source-week">Số tuần nguồn</Label>
            <Input
              id="copy-source-week"
              type="number"
              min={1}
              max={53}
              placeholder="VD: 20"
              value={copySourceWeek}
              onChange={(e) => { setCopySourceWeek(e.target.value); if (copyError) setCopyError(null); }}
              autoFocus
            />
            {copyError && <p className="text-xs text-rose-600">{copyError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)} disabled={copying}>Hủy</Button>
            <Button onClick={handleCopyWeek} disabled={copying} className="bg-indigo-600 text-white hover:bg-indigo-700">
              {copying ? "Đang copy..." : "Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
