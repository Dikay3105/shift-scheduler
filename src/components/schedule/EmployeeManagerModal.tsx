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
import type { Employee } from "@/lib/schedule-types";

const PALETTE = ["#db2777", "#0369a1", "#059669", "#b45309", "#dc2626", "#0891b2", "#7c3aed", "#1e293b"];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  onAdd: (name: string, color: string) => void;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
  onDelete: (id: string) => void;
};

export function EmployeeManagerModal({ open, onOpenChange, employees, onAdd, onUpdate, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quản lý nhân viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {employees.map((e) => (
            <div key={e.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
              <input
                type="color"
                value={e.color}
                onChange={(ev) => onUpdate(e.id, { color: ev.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-border"
              />
              <Input
                value={e.name}
                onChange={(ev) => onUpdate(e.id, { name: ev.target.value })}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)}>
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
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(ev) => setNewColor(ev.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border"
            />
            <Input
              placeholder="Tên nhân viên"
              value={newName}
              onChange={(ev) => setNewName(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && newName.trim()) {
                  onAdd(newName.trim(), newColor);
                  setNewName("");
                }
              }}
            />
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                onAdd(newName.trim(), newColor);
                setNewName("");
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
