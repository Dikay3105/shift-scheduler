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

import {
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Trash2,
  CalendarDays,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminHeader from "@/components/adminHeader";

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
    refresh,
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

  const dayKeys = useMemo(
    () => days.map(formatDateKey),
    [days]
  );

  const { week, year } = getISOWeek(weekStart);

  const todayKey = formatDateKey(today);

  const [empOpen, setEmpOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);

  const [picker, setPicker] = useState<{
    empId: string;
    dateKey: string;
  } | null>(null);

  const [confirmClear, setConfirmClear] = useState(false);

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  const pickerEmp = picker
    ? state.employees.find((e) => e.id === picker.empId)
    : null;

  const pickerDay = picker
    ? days[dayKeys.indexOf(picker.dateKey)]
    : null;

  const pickerCurrent = picker
    ? state.assignments[`${picker.empId}|${picker.dateKey}`] ?? null
    : null;

  const subtitle = `Tuần từ ${pad2(
    days[0].getDate()
  )}/${pad2(days[0].getMonth() + 1)} – ${pad2(
    days[6].getDate()
  )}/${pad2(days[6].getMonth() + 1)} · Nhấn vào ô để chỉnh sửa`;

  return (
    <div className="min-h-screen bg-muted/30 px-4">
      <div className="min-h-screen overflow-hidden bg-muted/30">
        <AdminHeader
          title="Schedule Management"
          description="Quản lý lịch làm việc của nhân viên"
          backTo="/"
        />

        <div className="mx-auto max-w-6xl py-8">
          {/* HEADER */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
                <CalendarDays className="h-7 w-7" />
                Lịch Làm Việc
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmpOpen(true)}
              >
                <Users className="mr-1 h-4 w-4" />
                Nhân viên
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShiftOpen(true)}
              >
                <Clock className="mr-1 h-4 w-4" />
                Ca làm
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Xóa tuần
              </Button>

              <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setWeekOffset((o) => o - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2 text-xs font-semibold hover:text-primary"
                >
                  Tuần này
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setWeekOffset((o) => o + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
                Tuần {week} · {year}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="min-w-[180px] border-r border-border/20 bg-foreground p-3 pl-5 text-left text-xs font-semibold text-background">
                      Nhân viên
                    </th>

                    {days.map((d, i) => {
                      const isWeekend = i >= 5;
                      const isToday = formatDateKey(d) === todayKey;

                      return (
                        <th
                          key={i}
                          className={`border-r border-border/20 p-3 text-center text-xs font-semibold last:border-r-0 ${isWeekend
                            ? "bg-stone-800 text-orange-300"
                            : "bg-foreground text-background"
                            }`}
                        >
                          <div
                            className={`text-[13px] font-bold ${isToday
                              ? "underline underline-offset-4"
                              : ""
                              }`}
                          >
                            {DAY_NAMES[i]}
                          </div>

                          <div className="mt-0.5 text-lg font-bold opacity-90">
                            {pad2(d.getDate())}/
                            {pad2(d.getMonth() + 1)}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {state.employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-border last:border-b-0"
                    >
                      {/* EMPLOYEE */}
                      <td className="border-r border-border px-5 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: emp.color }}
                          />

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {emp.name}
                            </div>

                            {emp.role && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {emp.role}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DAYS */}
                      {dayKeys.map((dk, i) => {
                        const isWeekend = i >= 5;

                        const shiftId =
                          state.assignments[`${emp.id}|${dk}`];

                        const shift = shiftId
                          ? state.shifts.find((s) => s.id === shiftId)
                          : null;

                        return (
                          <td
                            key={dk}
                            className={`border-r border-border p-2 text-center last:border-r-0 ${isWeekend ? "bg-orange-50/40" : ""
                              }`}
                          >
                            {shift ? (
                              <button
                                onClick={() =>
                                  setPicker({
                                    empId: emp.id,
                                    dateKey: dk,
                                  })
                                }
                                className="inline-block min-w-[92px] rounded-xl border border-white/30 px-3 py-2.5 text-center font-medium transition-all hover:scale-105 hover:shadow-md"
                                style={{
                                  background: shift.bg,
                                  color: shift.fg,
                                  boxShadow:
                                    "0 2px 6px rgba(0,0,0,0.08)",
                                }}
                              >
                                <div className="text-sm font-bold uppercase tracking-wider drop-shadow-sm">
                                  {shift.code}
                                </div>

                                <div className="mt-1 text-[10px] font-medium opacity-90">
                                  {shift.start} – {shift.end}
                                </div>
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setPicker({
                                    empId: emp.id,
                                    dateKey: dk,
                                  })
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-dashed border-border text-muted-foreground transition-all hover:scale-110 hover:border-muted-foreground hover:bg-muted/60"
                              >
                                <span className="text-lg font-light">
                                  +
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {state.employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Chưa có nhân viên. Bấm "Nhân viên" để thêm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LEGEND */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">
              Ca:
            </span>

            {state.shifts.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: s.bg,
                    borderColor: s.fg,
                  }}
                />

                <span
                  className="font-semibold"
                  style={{ color: s.fg }}
                >
                  {s.code}
                </span>

                <span className="text-muted-foreground">
                  {s.start}–{s.end}
                </span>
              </span>
            ))}
          </div>
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
          shifts={state.shifts}
          onAdd={addShift}
          onUpdate={updateShift}
          onDelete={deleteShift}
          onRefresh={refresh}
        />

        <ShiftPickerModal
          open={!!picker}
          onOpenChange={(v) => !v && setPicker(null)}
          currentShiftId={pickerCurrent}
          employeeName={pickerEmp?.name}
          dateLabel={
            pickerDay
              ? `${DAY_NAMES[dayKeys.indexOf(picker!.dateKey)]
              } ${pad2(pickerDay.getDate())}/${pad2(
                pickerDay.getMonth() + 1
              )}`
              : undefined
          }
          onSelect={(shiftId) => {
            if (picker) {
              setAssignment(
                picker.empId,
                picker.dateKey,
                shiftId
              );
            }
          }}
        />

        {/* CLEAR WEEK */}
        <AlertDialog
          open={confirmClear}
          onOpenChange={setConfirmClear}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Xóa tất cả ca trong tuần?
              </AlertDialogTitle>

              <AlertDialogDescription>
                Toàn bộ phân ca của tuần {week}/{year} sẽ bị
                xóa. Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>
                Hủy
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={() => clearWeek(dayKeys)}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}