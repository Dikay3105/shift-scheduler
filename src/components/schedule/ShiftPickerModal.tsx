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
import { scheduleApi } from "@/services/api";   // ← Import API

const GROUP_LABELS: Record<ShiftGroup, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

const GROUP_STYLE: Record<ShiftGroup, string> = {
  sang: "bg-blue-100 text-blue-700",
  chieu: "bg-yellow-100 text-yellow-800",
  toi: "bg-purple-100 text-purple-800",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentShiftId?: string | null;
  employeeName?: string;
  dateLabel?: string;
  onSelect: (shiftId: string | null) => void;
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

  // Tự động load ca khi mở modal
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
          group: group,
          bg: s.color || preset.bg,
          fg: preset.fg,
        };
      });

      setShifts(formattedShifts);
    } catch (error) {
      console.error("Lỗi tải ca làm:", error);
      alert("Không thể tải danh sách ca. Vui lòng kiểm tra kết nối.");
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
      case "sang": return { bg: "#dbeafe", fg: "#1d4ed8" };
      case "chieu": return { bg: "#fef9c3", fg: "#92400e" };
      case "toi": return { bg: "#ede9fe", fg: "#5b21b6" };
      default: return { bg: "#e5e7eb", fg: "#374151" };
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

        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            groups.map((g) => {
              const list = shifts.filter((s) => s.group === g);
              if (list.length === 0) return null;

              return (
                <div key={g}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block mb-2 ${GROUP_STYLE[g]}`}>
                    {GROUP_LABELS[g]}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {list.map((s) => {
                      const selected = s.id === currentShiftId;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            onSelect(s.id);
                            onOpenChange(false);
                          }}
                          className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-[1.03] ${selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground"
                            }`}
                          style={{ background: s.bg, color: s.fg }}
                        >
                          <div className="text-sm font-bold">{s.code}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">
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

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {currentShiftId && (
            <Button
              variant="destructive"
              onClick={() => {
                onSelect(null);
                onOpenChange(false);
              }}
            >
              Xóa ca
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}