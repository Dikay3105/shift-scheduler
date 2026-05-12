import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Shift, ShiftGroup } from "@/lib/schedule-types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shifts: Shift[];
  currentShiftId?: string | null;
  employeeName?: string;
  dateLabel?: string;
  onSelect: (shiftId: string | null) => void;
};

const GROUP_LABELS: Record<ShiftGroup, string> = { sang: "Sáng", chieu: "Chiều", toi: "Tối" };
const GROUP_STYLE: Record<ShiftGroup, string> = {
  sang: "bg-blue-100 text-blue-700",
  chieu: "bg-yellow-100 text-yellow-800",
  toi: "bg-purple-100 text-purple-800",
};

export function ShiftPickerModal({ open, onOpenChange, shifts, currentShiftId, employeeName, dateLabel, onSelect }: Props) {
  const groups: ShiftGroup[] = ["sang", "chieu", "toi"];
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

        <div className="space-y-3">
          {groups.map((g) => {
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
                        className={`p-2 rounded-lg border-2 text-left transition-all hover:scale-[1.03] ${
                          selected ? "border-primary ring-2 ring-primary/30" : "border-border"
                        }`}
                        style={{ background: s.bg, color: s.fg }}
                      >
                        <div className="text-xs font-bold">{s.code}</div>
                        <div className="text-[10px] opacity-80">{s.start}–{s.end}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {currentShiftId ? (
            <Button
              variant="destructive"
              onClick={() => {
                onSelect(null);
                onOpenChange(false);
              }}
            >
              Xóa ca
            </Button>
          ) : <span />}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
