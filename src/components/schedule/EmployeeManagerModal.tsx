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

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  "#db2777", "#0369a1", "#059669", "#b45309",
  "#dc2626", "#0891b2", "#7c3aed", "#1e293b",
];

// ─── Card HTML builders (ported from employeeCard.tsx) ────────────────────────
function makeFrontEl(name: string, role: string, empCode: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:350px;height:230px;border-radius:18px;overflow:hidden;background:#FFFAF8;" +
    "border:1px solid #FFADD0;display:flex;flex-direction:column;" +
    "font-family:'Be Vietnam Pro',ui-sans-serif,system-ui,sans-serif;box-sizing:border-box";

  const ini = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || "").slice(-2).join("");

  el.innerHTML = `
<div style="background:linear-gradient(to right,#E8607A,#CC4070,#A8305C);padding:10px 16px;
            display:flex;align-items:center;gap:10px;overflow:hidden;flex-shrink:0">
  <div style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.4);
              background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" width="16" height="16">
      <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"/>
      <path d="M12 12v8M9 16c1-1.5 4-1.5 6 0"/>
    </svg>
  </div>
  <div style="flex:1;min-width:0">
    <p style="color:white;font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;
              margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Cinnamon Forest</p>
  </div>
  <span style="background:rgba(0,0,0,.15);color:rgba(255,255,255,.8);font-size:8px;padding:3px 8px;
               border-radius:6px;letter-spacing:1px;text-transform:uppercase;flex-shrink:0">2024–2026</span>
</div>
<div style="flex:1;display:flex;align-items:center;gap:16px;padding:12px 16px;overflow:hidden">
  <div style="position:relative;width:76px;height:76px;border-radius:50%;
              background:linear-gradient(135deg,#F9C6D5,#E88AAE);display:flex;align-items:center;
              justify-content:center;font-size:28px;font-weight:600;color:#922054;flex-shrink:0;
              border:2.5px solid white;box-shadow:0 0 0 1.5px #FFADD0">
    ${ini}
    <div style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:50%;
                background:#FFFAF8;border:1px solid #FFADD0;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 24 24" fill="none" stroke="#C04060" stroke-width="2" width="12" height="12">
        <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"/>
      </svg>
    </div>
  </div>
  <div style="flex:1;min-width:0">
    <p style="font-size:20px;font-weight:600;color:#4A0F2A;margin:0 0 4px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</p>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#E0528A;
              margin:0 0 10px;font-family:'Be Vietnam Pro',sans-serif">${role || "Nhân viên"}</p>
    <div style="display:inline-flex;border-radius:8px;border:1px solid #FFD6E7;
                overflow:hidden;background:#FFF0F5">
      <span style="background:#FFD6E7;padding:4px 8px;font-size:9px;font-weight:500;
                   text-transform:uppercase;letter-spacing:.8px;color:#922054;font-family:'Be Vietnam Pro',sans-serif">ID</span>
      <span style="padding:4px 12px;font-size:11px;font-weight:500;letter-spacing:1.2px;
                   color:#4A0F2A;font-family:'Be Vietnam Pro',sans-serif">${empCode}</span>
    </div>
  </div>
</div>
<div style="height:30px;background:linear-gradient(to right,#CC4070,#E8607A);display:flex;
            align-items:center;justify-content:space-between;padding:0 16px;flex-shrink:0">
  <div style="display:flex;gap:4px">
    <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)"></div>
    <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)"></div>
    <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)"></div>
  </div>
  <span style="font-size:8.5px;text-transform:uppercase;letter-spacing:2.5px;
               color:rgba(255,255,255,.85);font-family:'Be Vietnam Pro',sans-serif">Nhân viên chính thức</span>
  <span style="font-size:10px;color:rgba(255,255,255,.6)">✦</span>
</div>`;

  return el;
}

function makeBackEl(
  addr = "123 Nguyễn Huệ, Q.1, TP.HCM",
  phone = "+84 28 3822 0000",
  email = "hello@cinnamonforest.com",
  web = "cinnamonforest.com",
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:350px;height:230px;border-radius:18px;overflow:hidden;background:#FFFAF8;" +
    "border:1px solid #FFADD0;display:flex;flex-direction:column;position:relative;" +
    "font-family:'Be Vietnam Pro',ui-sans-serif,system-ui,sans-serif;box-sizing:border-box";

  const row = (svg: string, text: string) => `
<div style="display:flex;align-items:flex-start;gap:6px">
  <div style="width:18px;height:18px;border-radius:5px;border:1px solid #FFD6E7;background:#FFF0F5;
              display:flex;align-items:center;justify-content:center;flex-shrink:0">${svg}</div>
  <span style="font-size:10px;color:#4A0F2A;line-height:1.5;word-break:break-all">${text}</span>
</div>`;

  el.innerHTML = `
<div style="height:36px;background:linear-gradient(to right,#E8607A,#A8305C);display:flex;
            align-items:center;justify-content:center;gap:8px;flex-shrink:0">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
    <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"/>
  </svg>
  <span style="font-family:'Be Vietnam Pro',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;
               letter-spacing:3px;color:white">Cinnamon Forest</span>
</div>
<div style="display:flex;gap:12px;padding:12px 16px;flex:1;overflow:hidden">
  <div style="flex:1;min-width:0">
    <p style="font-size:8.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px;
              color:#F472A8;margin:0 0 10px">Liên hệ công ty</p>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z"/><circle cx="8" cy="6" r="1.5"/></svg>', addr)}
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><path d="M3 3h2.5l1 3L5 7.5s.9 2.1 3.5 3.5L10 9.5l3 1V13c-6.5 1-11.5-6-10-10z"/></svg>', phone)}
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M2 5l6 5 6-5"/></svg>', email)}
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5C6.5 5 6 6.5 6 8s.5 3 2 5.5M8 2.5C9.5 5 10 6.5 10 8s-.5 3-2 5.5M2.5 8h11"/></svg>', web)}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
    <div style="width:74px;height:74px;border-radius:10px;border:1px solid #FFD6E7;background:white;
                padding:4px;display:flex;align-items:center;justify-content:center">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=https://cinnamonforest.com&color=922054&bgcolor=FFFFFF"
           width="66" height="66" crossorigin="anonymous"/>
    </div>
    <span style="font-size:7.5px;text-transform:uppercase;letter-spacing:.8px;color:#F472A8">Website</span>
  </div>
</div>
<div style="position:absolute;bottom:0;left:0;right:0;height:12px;
            background:linear-gradient(to right,#A8305C,#E8607A)"></div>`;

  return el;
}

// Load a Vietnamese-safe font into the capture document once
let vietFontLoaded = false;
async function ensureVietFont(): Promise<void> {
  if (vietFontLoaded) return;

  // Inject @font-face for Be Vietnam Pro (full Unicode + Vietnamese)
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
  `;
  document.head.appendChild(style);

  // Wait for fonts to finish loading
  if ((document as any).fonts?.ready) {
    await (document as any).fonts.ready;
  }
  // Extra buffer for remote font fetch
  await new Promise((r) => setTimeout(r, 600));
  vietFontLoaded = true;
}

async function captureEl(el: HTMLElement): Promise<string> {
  await ensureVietFont();
  const { toPng } = await import("html-to-image");
  await new Promise((r) => setTimeout(r, 120));
  return toPng(el, {
    pixelRatio: 3,
    backgroundColor: "#FFFAF8",
    width: 350,
    height: 230,
    // Pass the font to html-to-image so it embeds it during capture
    fontEmbedCSS: `
      @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
    `,
  });
}

async function mirrorImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.translate(img.width, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

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

    const frontEl = makeFrontEl(emp.name, emp.role || "Nhân viên", empCode);
    container.appendChild(frontEl);
    const frontUrl = await captureEl(frontEl);
    container.removeChild(frontEl);

    const backEl = makeBackEl();
    container.appendChild(backEl);
    const backUrl = await captureEl(backEl);
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

      // Stitch front + back side-by-side on one canvas
      const CARD_W = 350 * 3; // pixelRatio 3
      const CARD_H = 230 * 3;
      const GAP = 24;
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * 2 + GAP;
      canvas.height = CARD_H;
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
      ctx.drawImage(imgF, 0, 0, CARD_W, CARD_H);
      ctx.drawImage(imgB, CARD_W + GAP, 0, CARD_W, CARD_H);

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
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
      pdf.addImage(front, "PNG", 0, 0, 85.6, 54);
      pdf.addPage([85.6, 54], "landscape");
      pdf.addImage(back, "PNG", 0, 0, 85.6, 54);
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
