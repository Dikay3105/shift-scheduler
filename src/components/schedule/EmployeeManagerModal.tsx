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
import { Trash2, Plus, FileText, ImageDown, Loader2 } from "lucide-react";
import { ROLE_PRESETS, type Employee } from "@/lib/schedule-types";
import { jsPDF } from "jspdf";
import {
  CARD_W,
  CARD_H,
  makeFrontEl,
  makeBackEl,
  captureCardEl,
} from "@/lib/employee-card-template";

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  "#db2777", "#0369a1", "#059669", "#b45309",
  "#dc2626", "#0891b2", "#7c3aed", "#1e293b",
];

// ─── Capture both sides for a given employee ─────────────────────────────────
async function captureEmployeeCard(
  emp: Employee,
): Promise<{ front: string; back: string }> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(container);

  try {
    const empCode = emp.id.slice(-8).toUpperCase();

    const frontEl = makeFrontEl({
      name: emp.name,
      empCode,
      role: emp.role || "Nhân viên",
      company: "Cinnamon Forest",
    });
    container.appendChild(frontEl);
    const frontUrl = await captureCardEl(frontEl);
    container.removeChild(frontEl);

    const backEl = makeBackEl({ company: "Cinnamon Forest" });
    container.appendChild(backEl);
    const backUrl = await captureCardEl(backEl);
    container.removeChild(backEl);

    return { front: frontUrl, back: backUrl };
  } finally {
    document.body.removeChild(container);
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: Employee[];
  onAdd: (name: string, color: string, role?: string) => void;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
  onDelete: (id: string) => void;
};

// ─── Per-employee export buttons ─────────────────────────────────────────────
function EmployeeExportButtons({ emp }: { emp: Employee }) {
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);

  const safeName = emp.name.replace(/\s+/g, "_");

  const exportPNG = async () => {
    setBusy("png");
    try {
      const { front, back } = await captureEmployeeCard(emp);

      // Stitch front + back side-by-side (portrait cards)
      const W = CARD_W * 3; // pixelRatio 3
      const H = CARD_H * 3;
      const GAP = 24;
      const canvas = document.createElement("canvas");
      canvas.width = W * 2 + GAP;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const loadImg = (src: string) =>
        new Promise<HTMLImageElement>((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.src = src;
        });

      const [imgF, imgB] = await Promise.all([loadImg(front), loadImg(back)]);
      ctx.drawImage(imgF, 0, 0, W, H);
      ctx.drawImage(imgB, W + GAP, 0, W, H);

      const a = document.createElement("a");
      a.download = `the-${safeName}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (err) {
      console.error(err);
      alert("Xuất ảnh thất bại");
    } finally {
      setBusy(null);
    }
  };

  const exportPDF = async () => {
    setBusy("pdf");
    try {
      const { front, back } = await captureEmployeeCard(emp);
      // Portrait card 54x86 mm (CR80 portrait)
      const PDF_W = 54;
      const PDF_H = 86;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [PDF_W, PDF_H] });
      pdf.addImage(front, "PNG", 0, 0, PDF_W, PDF_H);
      pdf.addPage([PDF_W, PDF_H], "portrait");
      pdf.addImage(back, "PNG", 0, 0, PDF_W, PDF_H);
      pdf.save(`the-${safeName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Xuất PDF thất bại");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="col-span-2 flex items-center gap-1">
      {/* PNG button */}
      <button
        type="button"
        disabled={!!busy}
        onClick={exportPNG}
        title="Xuất ảnh PNG 2 mặt"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-[#FFD6E7] bg-[#FFF0F5] text-[#922054] transition hover:bg-[#FFD6E7] disabled:opacity-50"
      >
        {busy === "png" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageDown className="h-3.5 w-3.5" />
        )}
      </button>

      {/* PDF button */}
      <button
        type="button"
        disabled={!!busy}
        onClick={exportPDF}
        title="Xuất PDF 2 mặt"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
      >
        {busy === "pdf" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export function EmployeeManagerModal({
  open,
  onOpenChange,
  employees,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
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

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {employees.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-12 items-center gap-2 rounded-md border border-border bg-card p-2"
            >
              {/* Color picker — col 1 */}
              <input
                type="color"
                value={e.color}
                onChange={(ev) => onUpdate(e.id, { color: ev.target.value })}
                className="col-span-1 h-8 w-8 cursor-pointer rounded border border-border"
              />

              {/* Name — col 4 */}
              <Input
                value={e.name}
                onChange={(ev) => onUpdate(e.id, { name: ev.target.value })}
                className="col-span-4"
                placeholder="Tên"
              />

              {/* Role — col 3 */}
              <Input
                value={e.role ?? ""}
                onChange={(ev) => onUpdate(e.id, { role: ev.target.value })}
                className="col-span-3"
                placeholder="Chức vụ"
                list="role-presets"
              />

              {/* Export buttons — col 2 */}
              <EmployeeExportButtons emp={e} />

              {/* Delete — col 1 */}
              <Button
                variant="ghost"
                size="icon"
                className="col-span-1"
                onClick={() => onDelete(e.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          {employees.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Chưa có nhân viên
            </p>
          )}
        </div>

        {/* Legend for export icons */}
        <div className="flex items-center gap-4 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ImageDown className="h-3.5 w-3.5 text-[#922054]" />
            PNG 2 mặt (trước + sau)
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-rose-600" />
            PDF 2 trang (trước + sau)
          </span>
        </div>

        {/* Add new employee */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Thêm nhân viên mới
          </Label>
          <div className="grid grid-cols-12 items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(ev) => setNewColor(ev.target.value)}
              className="col-span-1 h-8 w-8 cursor-pointer rounded border border-border"
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
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ROLE_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNewRole(r)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${newRole === r
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:bg-muted"
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
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
