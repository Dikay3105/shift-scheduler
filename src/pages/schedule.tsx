import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
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
import { ChevronLeft, ChevronRight, Users, Clock, Trash2, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lịch làm việc" },
      { name: "description", content: "Quản lý lịch làm việc nhân viên theo tuần" },
    ],
  }),
  component: SchedulePage,
});

export default function SchedulePage() {
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
    refresh,
  } = useSchedule();

  // real-time "today"
  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfISOWeek(today), weekOffset * 7), [today, weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayKeys = useMemo(() => days.map(formatDateKey), [days]);
  const { week, year } = getISOWeek(weekStart);
  const todayKey = formatDateKey(today);

  const [empOpen, setEmpOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [picker, setPicker] = useState<{ empId: string; dateKey: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!hydrated) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Đang tải...</div>;
  }

  const pickerEmp = picker ? state.employees.find((e) => e.id === picker.empId) : null;
  const pickerDay = picker ? days[dayKeys.indexOf(picker.dateKey)] : null;
  const pickerCurrent = picker ? state.assignments[`${picker.empId}|${picker.dateKey}`] ?? null : null;

  const subtitle = `Tuần từ ${pad2(days[0].getDate())}/${pad2(days[0].getMonth() + 1)} – ${pad2(days[6].getDate())}/${pad2(days[6].getMonth() + 1)} · Nhấn vào ô để chỉnh sửa`;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="w-7 h-7" /> Lịch Làm Việc
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setEmpOpen(true)}>
              <Users className="w-4 h-4 mr-1" /> Nhân viên
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShiftOpen(true)}>
              <Clock className="w-4 h-4 mr-1" /> Ca làm
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Xóa tuần
            </Button>

            <div className="flex items-center gap-1 bg-card border border-border rounded-full p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs font-semibold px-3 hover:text-primary"
              >
                Tuần này
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-full">
              Tuần {week} · {year}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-foreground text-background text-xs font-semibold p-3 text-left pl-5 min-w-[140px] border-r border-border/20">
                    Nhân viên
                  </th>
                  {days.map((d, i) => {
                    const isWeekend = i >= 5;
                    const isToday = formatDateKey(d) === todayKey;
                    return (
                      <th
                        key={i}
                        className={`text-xs font-semibold p-3 text-center border-r border-border/20 last:border-r-0 ${isWeekend ? "bg-stone-800 text-orange-300" : "bg-foreground text-background"
                          }`}
                      >
                        <div className={`text-[13px] font-bold ${isToday ? "underline underline-offset-4" : ""}`}>
                          {DAY_NAMES[i]}
                        </div>
                        <div className="text-lg font-bold opacity-90 mt-0.5">
                          {pad2(d.getDate())}/{pad2(d.getMonth() + 1)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {state.employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-border last:border-b-0">
                    <td className="text-left py-3 px-5 border-r border-border">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: emp.color }} />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{emp.name}</div>
                          {emp.role && <div className="text-[11px] text-muted-foreground truncate">{emp.role}</div>}
                        </div>
                      </div>
                    </td>
                    {dayKeys.map((dk, i) => {
                      const isWeekend = i >= 5;
                      const shiftId = state.assignments[`${emp.id}|${dk}`];
                      const shift = shiftId ? state.shifts.find((s) => s.id === shiftId) : null;

                      return (
                        <td
                          key={dk}
                          className={`text-center p-2 border-r border-border last:border-r-0 ${isWeekend ? "bg-orange-50/40" : ""}`}
                        >
                          {shift ? (
                            <button
                              onClick={() => setPicker({ empId: emp.id, dateKey: dk })}
                              className="inline-block rounded-xl px-3 py-2.5 min-w-[92px] text-center transition-all hover:scale-105 hover:shadow-md border border-white/30 font-medium"
                              style={{
                                background: shift.bg,
                                color: shift.fg,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                              }}
                            >
                              <div className="text-sm font-bold uppercase tracking-wider drop-shadow-sm">
                                {shift.code}
                              </div>
                              <div className="text-[10px] font-medium mt-1 opacity-90">
                                {shift.start} – {shift.end}
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={() => setPicker({ empId: emp.id, dateKey: dk })}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border-[1.5px] border-dashed border-border text-muted-foreground hover:border-muted-foreground hover:bg-muted/60 transition-all hover:scale-110"
                            >
                              <span className="text-lg font-light">+</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {state.employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                      Chưa có nhân viên. Bấm "Nhân viên" để thêm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Ca:</span>
          {state.shifts.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-white/40 font-medium shadow-sm"
              style={{ background: s.bg, color: s.fg }}
            >
              <span className="font-bold">{s.code}</span>
              <span className="opacity-90 text-[10px]">{s.start}–{s.end}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Modals */}
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
        dateLabel={pickerDay ? `${DAY_NAMES[dayKeys.indexOf(picker!.dateKey)]} ${pad2(pickerDay.getDate())}/${pad2(pickerDay.getMonth() + 1)}` : undefined}
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