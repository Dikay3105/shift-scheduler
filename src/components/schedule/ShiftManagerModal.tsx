import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import type { Shift, ShiftGroup } from "@/lib/schedule-types";

const GROUP_LABELS: Record<ShiftGroup, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

const GROUP_PRESETS: Record<ShiftGroup, { bg: string; fg: string }> = {
  sang: { bg: "#dbeafe", fg: "#1d4ed8" },
  chieu: { bg: "#fef9c3", fg: "#92400e" },
  toi: { bg: "#ede9fe", fg: "#5b21b6" },
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shifts: Shift[];
  onAdd: (s: Omit<Shift, "id">) => void;
  onUpdate: (id: string, patch: Partial<Shift>) => void;
  onDelete: (id: string) => void;
};

export function ShiftManagerModal({ open, onOpenChange, shifts, onAdd, onUpdate, onDelete }: Props) {
  const [draft, setDraft] = useState<Omit<Shift, "id">>({
    code: "",
    label: "",
    start: "08:00",
    end: "12:00",
    group: "sang",
    bg: GROUP_PRESETS.sang.bg,
    fg: GROUP_PRESETS.sang.fg,
  });

  const groups: ShiftGroup[] = ["sang", "chieu", "toi"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản lý ca làm</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {groups.map((g) => {
            const list = shifts.filter((s) => s.group === g);
            return (
              <div key={g}>
                <div
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block mb-2"
                  style={{ background: GROUP_PRESETS[g].bg, color: GROUP_PRESETS[g].fg }}
                >
                  {GROUP_LABELS[g]}
                </div>
                <div className="space-y-2">
                  {list.map((s) => (
                    <div key={s.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-border bg-card">
                      <Input
                        value={s.code}
                        onChange={(e) => onUpdate(s.id, { code: e.target.value })}
                        className="col-span-2"
                        placeholder="Mã"
                      />
                      <Input
                        value={s.label}
                        onChange={(e) => onUpdate(s.id, { label: e.target.value })}
                        className="col-span-3"
                        placeholder="Tên"
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
                      <div className="col-span-2 flex gap-1">
                        <input type="color" value={s.bg} onChange={(e) => onUpdate(s.id, { bg: e.target.value })} className="w-7 h-9 rounded border border-border" title="Nền" />
                        <input type="color" value={s.fg} onChange={(e) => onUpdate(s.id, { fg: e.target.value })} className="w-7 h-9 rounded border border-border" title="Chữ" />
                      </div>
                      <Button variant="ghost" size="icon" className="col-span-1" onClick={() => onDelete(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2">Chưa có ca</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Thêm ca mới</Label>
          <div className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-2" placeholder="Mã (S3)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            <Input className="col-span-3" placeholder="Tên" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <Input className="col-span-2" type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            <Input className="col-span-2" type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            <Select value={draft.group} onValueChange={(v: ShiftGroup) => setDraft({ ...draft, group: v, ...GROUP_PRESETS[v] })}>
              <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g} value={g}>{GROUP_LABELS[g]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              className="col-span-1"
              size="icon"
              onClick={() => {
                if (!draft.code.trim() || !draft.label.trim()) return;
                onAdd({ ...draft, code: draft.code.trim(), label: draft.label.trim() });
                setDraft({ ...draft, code: "", label: "" });
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
