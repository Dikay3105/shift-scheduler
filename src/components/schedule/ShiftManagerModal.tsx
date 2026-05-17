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
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { Shift, ShiftGroup } from "@/lib/schedule-types";
import { getShiftColor } from "@/lib/shift-colors";
import { scheduleApi } from "@/services/api";

// Session từ DB: morning | afternoon | night
type ShiftSession = "morning" | "afternoon" | "night";

// Map session DB → ShiftGroup FE (để nhóm hiển thị)
const SESSION_TO_GROUP: Record<ShiftSession, ShiftGroup> = {
  morning: "sang",
  afternoon: "chieu",
  night: "toi",
};

const GROUP_TO_SESSION: Record<ShiftGroup, ShiftSession> = {
  sang: "morning",
  chieu: "afternoon",
  toi: "night",
};

const GROUP_LABELS: Record<ShiftGroup, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

const SESSION_LABELS: Record<ShiftSession, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Tối",
};

const GROUP_PRESETS: Record<ShiftGroup, { bg: string; fg: string }> = {
  sang: { bg: "#dbeafe", fg: "#1e40af" },
  chieu: { bg: "#fef3c7", fg: "#854d0e" },
  toi: { bg: "#ede9fe", fg: "#4c1d95" },
};

const EXTRA_COLORS = [
  { bg: "#bfdbfe", fg: "#1e3a8a" },
  { bg: "#bae6fd", fg: "#0e7490" },
  { bg: "#a5f3fc", fg: "#164e63" },
  { bg: "#fde68c", fg: "#78350f" },
  { bg: "#fcd34d", fg: "#713f12" },
  { bg: "#fed7aa", fg: "#9a3412" },
  { bg: "#d1fae5", fg: "#14532d" },
  { bg: "#ddd6fe", fg: "#4338ca" },
  { bg: "#c4b5fd", fg: "#3730a3" },
  { bg: "#fce7f3", fg: "#831843" },
];

// Extend Shift để mang thêm session từ DB
interface ShiftWithSession extends Shift {
  session: ShiftSession;
}

export function ShiftManagerModal({
  open,
  onOpenChange,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (s: Omit<Shift, "id"> & { session: ShiftSession }) => void;
  onUpdate: (id: string, patch: Partial<Shift> & { session?: ShiftSession }) => void;
  onDelete: (id: string) => void;
}) {
  const [shifts, setShifts] = useState<ShiftWithSession[]>([]);
  const [draft, setDraft] = useState<Omit<ShiftWithSession, "id">>({
    code: "",
    label: "",
    start: "08:00",
    end: "12:00",
    group: "sang",
    session: "morning",
    bg: GROUP_PRESETS.sang.bg,
    fg: GROUP_PRESETS.sang.fg,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);

  const groups: ShiftGroup[] = ["sang", "chieu", "toi"];
  const sessions: ShiftSession[] = ["morning", "afternoon", "night"];

  useEffect(() => {
    if (open) loadShifts();
  }, [open]);

  // Tự động cập nhật mã ca: lấy số lớn nhất trong danh sách rồi +1
  useEffect(() => {
    const maxNum = shifts.reduce((max, s) => {
      const match = s.code.match(/^Ca(\d+)$/i);
      const num = match ? parseInt(match[1]) : 0;
      return Math.max(max, num);
    }, 0);
    setDraft((prev) => ({ ...prev, code: `Ca${maxNum + 1}` }));
  }, [shifts]);

  const loadShifts = async () => {
    try {
      // setIsLoading(true);
      const response = await scheduleApi.getShifts();
      const shiftsApi = response.data || [];

      const formattedShifts: ShiftWithSession[] = shiftsApi.map((s: any, index: number) => {
        // Lấy session trực tiếp từ DB (morning | afternoon | night)
        const session: ShiftSession = s.session ?? "morning";
        const group: ShiftGroup = SESSION_TO_GROUP[session];
        const color = getShiftColor(index);

        return {
          id: s._id,
          code: s.shiftCode,
          label: "",
          start: s.startTime,
          end: s.endTime,
          session,
          group,
          bg: color.bg,
          fg: color.fg,
        };
      });

      setShifts(formattedShifts);
    } catch (error) {
      console.error("Lỗi tải ca:", error);
    } finally {
      // setIsLoading(false);
    }
  };

  // Cập nhật local state ngay lập tức để UI phản hồi nhanh
  const handleUpdateField = (
    id: string,
    patch: Partial<ShiftWithSession>
  ) => {
    // Nếu đổi session thì đồng bộ group
    if (patch.session) {
      patch.group = SESSION_TO_GROUP[patch.session];
    }
    // Nếu đổi group thì đồng bộ session
    if (patch.group && !patch.session) {
      patch.session = GROUP_TO_SESSION[patch.group];
    }

    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );

    // Gửi lên API
    onUpdate(id, patch);
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

    const extra = EXTRA_COLORS[colorIndex % EXTRA_COLORS.length];

    await onAdd({
      code: draft.code.trim().toUpperCase(),
      label: "",
      start: draft.start,
      end: draft.end,
      group: draft.group,
      session: draft.session,
      bg: extra.bg,
      fg: extra.fg,
    });

    setColorIndex((prev) => prev + 1);
    await loadShifts();

    setDraft((prev) => ({
      ...prev,
      code: "",   // useEffect sẽ tự điền Ca(n+1) sau khi shifts reload
      label: "",
      start: "08:00",
      end: "12:00",
      group: "sang",
      session: "morning",
      bg: GROUP_PRESETS.sang.bg,
      fg: GROUP_PRESETS.sang.fg,
    }));
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
                    style={{
                      background: GROUP_PRESETS[g].bg,
                      color: GROUP_PRESETS[g].fg,
                    }}
                  >
                    {GROUP_LABELS[g]}
                  </div>

                  <div className="space-y-2">
                    {list.map((s) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-12 gap-3 items-center p-4 rounded-xl border-2 transition-shadow hover:shadow-md"
                        style={{
                          background: `${s.bg}55`,
                          borderColor: s.bg,
                        }}
                      >
                        {/* Mã ca */}
                        <div
                          className="col-span-2 flex items-center justify-center rounded-lg px-2 py-2 font-mono font-black text-base"
                          style={{ background: s.bg, color: s.fg }}
                          title={s.code}
                        >
                          {s.code}
                        </div>

                        {/* Giờ bắt đầu */}
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Bắt đầu
                          </Label>
                          <Input
                            type="time"
                            value={s.start}
                            onChange={(e) =>
                              handleUpdateField(s.id, { start: e.target.value })
                            }
                            className="bg-white/80"
                          />
                        </div>

                        {/* Giờ kết thúc */}
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Kết thúc
                          </Label>
                          <Input
                            type="time"
                            value={s.end}
                            onChange={(e) =>
                              handleUpdateField(s.id, { end: e.target.value })
                            }
                            className="bg-white/80"
                          />
                        </div>

                        {/* Dropdown chọn session (sáng/chiều/tối) */}
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Buổi
                          </Label>
                          <Select
                            value={s.session}
                            onValueChange={(v: ShiftSession) =>
                              handleUpdateField(s.id, { session: v })
                            }
                          >
                            <SelectTrigger className="bg-white/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sessions.map((sess) => (
                                <SelectItem key={sess} value={sess}>
                                  {SESSION_LABELS[sess]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Khoảng trống */}
                        <div className="col-span-2" />

                        {/* Nút xóa */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="col-span-1 text-destructive"
                          onClick={async () => {
                            onDelete(s.id);
                            await loadShifts();
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

        {/* Form thêm ca mới */}
        <div className="border-t pt-6">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-3 block">
            Thêm ca mới
          </Label>

          <div className="grid grid-cols-12 gap-3 items-end">
            {/* Mã ca */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Mã ca
              </Label>
              <Input
                placeholder="VD: S3"
                value={draft.code}
                onChange={(e) =>
                  setDraft({ ...draft, code: e.target.value })
                }
              />
            </div>

            {/* Giờ bắt đầu */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Bắt đầu
              </Label>
              <Input
                type="time"
                value={draft.start}
                onChange={(e) =>
                  setDraft({ ...draft, start: e.target.value })
                }
              />
            </div>

            {/* Giờ kết thúc */}
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Kết thúc
              </Label>
              <Input
                type="time"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </div>

            {/* Dropdown buổi (session) */}
            <div className="col-span-3">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Buổi
              </Label>
              <Select
                value={draft.session}
                onValueChange={(v: ShiftSession) =>
                  setDraft({
                    ...draft,
                    session: v,
                    group: SESSION_TO_GROUP[v],
                    ...GROUP_PRESETS[SESSION_TO_GROUP[v]],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((sess) => (
                    <SelectItem key={sess} value={sess}>
                      {SESSION_LABELS[sess]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nút thêm */}
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
