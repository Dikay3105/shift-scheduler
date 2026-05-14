import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, CheckCircle, Loader2 } from "lucide-react";
import type { Shift, ShiftGroup } from "@/lib/schedule-types";
import { getShiftColor } from "@/lib/shift-colors";
import { scheduleApi } from "@/services/api";

const GROUP_LABELS: Record<ShiftGroup, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

// Nhiều màu pastel hơn
const GROUP_PRESETS: Record<ShiftGroup, { bg: string; fg: string }> = {
  sang: { bg: "#dbeafe", fg: "#1e40af" },     // Xanh dương nhạt
  chieu: { bg: "#fef3c7", fg: "#854d0e" },   // Vàng nhạt
  toi: { bg: "#ede9fe", fg: "#4c1d95" },     // Tím nhạt
};

// Màu dự phòng cho nhiều ca
const EXTRA_COLORS = [
  { bg: "#bfdbfe", fg: "#1e3a8a" },   // Xanh dương đậm hơn
  { bg: "#bae6fd", fg: "#0e7490" },   // Xanh cyan
  { bg: "#a5f3fc", fg: "#164e63" },
  { bg: "#fde68c", fg: "#78350f" },   // Vàng cam
  { bg: "#fcd34d", fg: "#713f12" },
  { bg: "#fed7aa", fg: "#9a3412" },   // Cam đào
  { bg: "#d1fae5", fg: "#14532d" },   // Xanh mint
  { bg: "#ddd6fe", fg: "#4338ca" },   // Tím nhạt
  { bg: "#c4b5fd", fg: "#3730a3" },   // Tím đậm
  { bg: "#fce7f3", fg: "#831843" },   // Hồng
];

export function ShiftManagerModal({
  open,
  onOpenChange,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (s: Omit<Shift, "id">) => void;
  onUpdate: (id: string, patch: Partial<Shift>) => void;
  onDelete: (id: string) => void;
}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [draft, setDraft] = useState<Omit<Shift, "id">>({
    code: "",
    label: "",
    start: "08:00",
    end: "12:00",
    group: "sang",
    bg: GROUP_PRESETS.sang.bg,
    fg: GROUP_PRESETS.sang.fg,
  });

  const [justAdded, setJustAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);

  const groups: ShiftGroup[] = ["sang", "chieu", "toi"];

  useEffect(() => {
    if (open) loadShifts();
  }, [open]);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const response = await scheduleApi.getShifts();
      const shiftsApi = response.data || [];

      const formattedShifts: Shift[] = shiftsApi.map((s: any, index: number) => {
        const group = getGroupFromTime(s.startTime);
        const preset = GROUP_PRESETS[group];
        const extra = EXTRA_COLORS[index % EXTRA_COLORS.length];

        return {
          id: s._id,
          code: s.shiftCode,
          label: "",
          start: s.startTime,
          end: s.endTime,
          group,
          bg: s.color || extra.bg,        // Dùng màu extra để đa dạng
          fg: extra.fg,
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

  const handleAdd = async () => {
    if (!draft.code.trim()) {
      alert("Vui lòng nhập mã ca");
      return;
    }
    if (draft.start >= draft.end) {
      alert("Giờ kết thúc phải lớn hơn giờ bắt đầu");
      return;
    }

    const preset = GROUP_PRESETS[draft.group];
    const extra = EXTRA_COLORS[colorIndex % EXTRA_COLORS.length];

    await onAdd({
      code: draft.code.trim().toUpperCase(),
      label: "",
      start: draft.start,
      end: draft.end,
      group: draft.group,
      bg: extra.bg,
      fg: extra.fg,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    setColorIndex((prev) => prev + 1);

    loadShifts();

    setDraft({
      code: "",
      label: "",
      start: "08:00",
      end: "12:00",
      group: "sang",
      bg: GROUP_PRESETS.sang.bg,
      fg: GROUP_PRESETS.sang.fg,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản lý Ca Làm</DialogTitle>
        </DialogHeader>

        {/* Danh sách ca */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            groups.map((g) => {
              const list = shifts.filter((s) => s.group === g);
              return (
                <div key={g}>
                  <div
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded inline-block mb-3"
                    style={{ background: GROUP_PRESETS[g].bg, color: GROUP_PRESETS[g].fg }}
                  >
                    {GROUP_LABELS[g]}
                  </div>

                  <div className="space-y-2">
                    {list.map((s) => (
                      <div key={s.id} className="grid grid-cols-12 gap-3 items-center p-4 rounded-xl border bg-card">
                        <Input
                          value={s.code}
                          onChange={(e) => onUpdate(s.id, { code: e.target.value.toUpperCase() })}
                          className="col-span-2 font-mono font-semibold"
                        />
                        <Input
                          type="time"
                          value={s.start}
                          onChange={(e) => onUpdate(s.id, { start: e.target.value })}
                          className="col-span-2"
                        />
                        <Input
                          type="time"
                          value={s.end}
                          onChange={(e) => onUpdate(s.id, { end: e.target.value })}
                          className="col-span-2"
                        />

                        <div className="col-span-3 text-sm font-medium">
                          {s.start} – {s.end}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="col-span-1 text-destructive"
                          onClick={() => {
                            onDelete(s.id);
                            loadShifts();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {list.length === 0 && (
                      <p className="text-sm text-muted-foreground italic px-4 py-6">
                        Chưa có ca nào trong nhóm này
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Form thêm ca */}
        <div className="border-t pt-6">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-3 block">
            Thêm ca mới
          </Label>

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2">
              <Input
                placeholder="Mã ca (S3)"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>

            <div className="col-span-2">
              <Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>

            <div className="col-span-3">
              <Select
                value={draft.group}
                onValueChange={(v: ShiftGroup) =>
                  setDraft({ ...draft, group: v, ...GROUP_PRESETS[v] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GROUP_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAdd} className="col-span-3" size="default">
              <Plus className="w-4 h-4 mr-2" />
              Thêm ca
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}