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
import { Trash2, Plus } from "lucide-react";
import { ROLE_PRESETS, type Employee } from "@/lib/schedule-types";

const PALETTE = ["#db2777", "#0369a1", "#059669", "#b45309", "#dc2626", "#0891b2", "#7c3aed", "#1e293b"];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  onAdd: (name: string, color: string, role?: string) => void;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
  onDelete: (id: string) => void;
};

export function EmployeeManagerModal({ open, onOpenChange, employees, onAdd, onUpdate, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [newRole, setNewRole] = useState("");

  const submit = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newColor, newRole.trim() || undefined);
    setNewName("");
    setNewRole("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quản lý nhân viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {employees.map((e) => (
            <div key={e.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-border bg-card">
              <input
                type="color"
                value={e.color}
                onChange={(ev) => onUpdate(e.id, { color: ev.target.value })}
                className="col-span-1 w-8 h-8 rounded cursor-pointer border border-border"
              />
              <Input
                value={e.name}
                onChange={(ev) => onUpdate(e.id, { name: ev.target.value })}
                className="col-span-6"
                placeholder="Tên"
              />
              <Input
                value={e.role ?? ""}
                onChange={(ev) => onUpdate(e.id, { role: ev.target.value })}
                className="col-span-4"
                placeholder="Chức vụ"
                list="role-presets"
              />
              <Button variant="ghost" size="icon" className="col-span-1" onClick={() => onDelete(e.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
          {employees.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Chưa có nhân viên</p>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Thêm nhân viên mới</Label>
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              type="color"
              value={newColor}
              onChange={(ev) => setNewColor(ev.target.value)}
              className="col-span-1 w-8 h-8 rounded cursor-pointer border border-border"
            />
            <Input
              className="col-span-5"
              placeholder="Tên nhân viên"
              value={newName}
              onChange={(ev) => setNewName(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && submit()}
            />
            <Input
              className="col-span-5"
              placeholder="Chức vụ (chọn hoặc gõ)"
              value={newRole}
              onChange={(ev) => setNewRole(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && submit()}
              list="role-presets"
            />
            <Button className="col-span-1" size="icon" onClick={submit}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNewRole(r)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  newRole === r
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <datalist id="role-presets">
            {ROLE_PRESETS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
