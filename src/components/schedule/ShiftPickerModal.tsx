import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

import type { Shift, ShiftGroup } from "@/lib/schedule-types";
import { getShiftColor } from "@/lib/shift-colors";

import { scheduleApi } from "@/services/api";

const GROUP_LABELS: Record<ShiftGroup, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

const GROUP_STYLE: Record<ShiftGroup, string> = {
  sang: "bg-blue-100 text-blue-700",
  chieu: "bg-yellow-100 text-yellow-800",
  toi: "bg-purple-100 text-purple-700",
};

// Lấy group từ session DB thay vì tính từ giờ
const SESSION_TO_GROUP: Record<string, ShiftGroup> = {
  morning: "sang",
  afternoon: "chieu",
  night: "toi",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  currentShiftId?: string | null;

  employeeName?: string;
  dateLabel?: string;

  onSelect: (shiftId: string | null) => Promise<void> | void;
};

export function ShiftPickerModal({
  open,
  onOpenChange,
  currentShiftId,
  employeeName,
  dateLabel,
  onSelect,
}: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const groups: ShiftGroup[] = ["sang", "chieu", "toi"];

  useEffect(() => {
    if (open) {
      loadShifts();
    }
  }, [open]);

  const loadShifts = async () => {
    try {
      setIsLoading(true);

      const response = await scheduleApi.getShifts();
      const shiftsApi = response.data || [];

      const formattedShifts: Shift[] = shiftsApi.map((s: any, i: number) => {
        // Lấy group từ session DB, fallback về "sang" nếu không có
        const session: string = s.session ?? "morning";
        const group: ShiftGroup = SESSION_TO_GROUP[session] ?? "sang";
        const color = getShiftColor(i);

        return {
          id: s._id,
          code: s.shiftCode,
          label: "",
          start: s.startTime,
          end: s.endTime,
          group,
          bg: color.bg,
          fg: color.fg,
        };
      });

      setShifts(formattedShifts);
    } catch (error) {
      console.error("Lỗi tải ca:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (shiftId: string | null) => {
    try {
      setIsLoading(true);

      await onSelect(shiftId);

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100%-1rem)] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Chọn ca làm</DialogTitle>

          {(employeeName || dateLabel) && (
            <p className="text-xs text-muted-foreground">
              {employeeName} · {dateLabel}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2 px-6 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            groups.map((g) => {
              const list = shifts.filter((s) => s.group === g);

              if (list.length === 0) return null;

              return (
                <div key={g}>
                  {/* GROUP HEADER */}
                  <div
                    className={`
                      mb-3 flex items-center gap-2 rounded-xl px-3 py-2
                      text-[12px] font-bold uppercase tracking-wider
                      ${GROUP_STYLE[g]}
                    `}
                  >
                    <span className="text-sm">
                      {g === "sang" && "☀️"}
                      {g === "chieu" && "🌤️"}
                      {g === "toi" && "🌙"}
                    </span>

                    {GROUP_LABELS[g]}
                  </div>

                  {/* GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {list.map((s) => {
                      const selected = s.id === currentShiftId;

                      return (
                        <button
                          key={s.id}
                          disabled={isLoading}
                          onClick={() => handleSelect(s.id)}
                          className={`
                            relative rounded-2xl border-2 px-3 py-3 text-center
                            transition-all duration-200
                            ${selected
                              ? "scale-[1.05] shadow-xl ring-2 ring-offset-4"
                              : "border-transparent hover:scale-[1.03] hover:shadow-md"
                            }
                          `}
                          style={{
                            background: s.bg,
                            color: s.fg,
                            borderColor: selected ? s.fg : "transparent",
                            boxShadow: selected ? `0 12px 28px ${s.bg}` : undefined,
                          }}
                        >
                          {selected && (
                            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
                              <Check className="w-4 h-4" style={{ color: s.fg }} />
                            </span>
                          )}

                          <div className="text-[18px] font-black tracking-wide">
                            {s.code}
                          </div>

                          <div className="mt-1 text-[12px] font-semibold opacity-80">
                            {s.start}–{s.end}
                          </div>

                          {selected && (
                            <div
                              className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-white/80"
                              style={{ color: s.fg }}
                            >
                              Đã chọn
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between px-6 pb-6 pt-2 shrink-0 border-t">
          {currentShiftId ? (
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => handleSelect(null)}
            >
              Xóa ca
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="secondary"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
