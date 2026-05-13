import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import type { Shift, ShiftGroup } from "@/lib/schedule-types";

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

      const formattedShifts: Shift[] = shiftsApi.map((s: any) => {
        const group = getGroupFromTime(s.startTime);

        const preset = getPresetColors(group);

        return {
          id: s._id,
          code: s.shiftCode,
          label: "",
          start: s.startTime,
          end: s.endTime,
          group,
          bg: s.color || preset.bg,
          fg: preset.fg,
        };
      });

      setShifts(formattedShifts);
    } catch (error) {
      console.error("Lỗi tải ca:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGroupFromTime = (startTime: string): ShiftGroup => {
    const hour = parseInt(startTime.split(":")[0]);

    if (hour >= 18) return "toi";
    if (hour >= 12) return "chieu";

    return "sang";
  };

  const getPresetColors = (group: ShiftGroup) => {
    switch (group) {
      case "sang":
        return {
          bg: "#dbeafe",
          fg: "#1d4ed8",
        };

      case "chieu":
        return {
          bg: "#fef9c3",
          fg: "#92400e",
        };

      case "toi":
        return {
          bg: "#ede9fe",
          fg: "#5b21b6",
        };

      default:
        return {
          bg: "#e5e7eb",
          fg: "#374151",
        };
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn ca làm</DialogTitle>

          {(employeeName || dateLabel) && (
            <p className="text-xs text-muted-foreground">
              {employeeName} · {dateLabel}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {list.map((s) => {
                      const selected = s.id === currentShiftId;

                      return (
                        <button
                          key={s.id}
                          disabled={isLoading}
                          onClick={() => handleSelect(s.id)}
                          className={`
                    relative rounded-2xl border px-3 py-3 text-center
                    transition-all duration-200

                    ${selected
                              ? `
                          scale-[1.02]
                          border-transparent
                          shadow-lg
                        `
                              : `
                          border-slate-200
                          bg-slate-50
                          hover:border-slate-300
                          hover:bg-slate-100
                        `
                            }
                  `}
                          style={
                            selected
                              ? {
                                background: s.bg,
                                color: s.fg,
                                boxShadow: `0 8px 20px ${s.bg}90`,
                              }
                              : {}
                          }
                        >
                          {/* selected glow */}
                          {selected && (
                            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/40" />
                          )}

                          <div
                            className={`
                      text-[18px] font-black tracking-wide
                      ${selected ? "text-white" : "text-slate-800"}
                    `}
                          >
                            {s.code}
                          </div>

                          <div
                            className={`
                      mt-1 text-[12px] font-semibold
                      ${selected ? "text-white/90" : "text-slate-500"}
                    `}
                          >
                            {s.start}–{s.end}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
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