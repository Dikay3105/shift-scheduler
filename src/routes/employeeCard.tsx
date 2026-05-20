import AdminHeader from "@/components/AdminHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { scheduleApi } from "@/services/api";
import {
  CARD_W,
  CARD_H,
  makeFrontEl,
  makeBackEl,
  captureCardEl,
  type FrontData,
  type BackData,
} from "@/lib/employee-card-template";

export const Route = createFileRoute("/employeeCard")({
  component: EmployeeCardPage,
});

// PDF: CR80 portrait
const PDF_W = 54;
const PDF_H = 86;

type BulkFormat = "pdf" | "png-zip" | "png-sheet";

const BULK_OPTIONS: { v: BulkFormat; t: string; d: string }[] = [
  { v: "pdf", t: "PDF 2 mặt", d: "Mỗi NV 2 trang (trước + sau), in 2 mặt." },
  { v: "png-zip", t: "ZIP nhiều ảnh PNG", d: "Mỗi NV 2 file PNG (trước/sau) trong 1 file ZIP." },
  { v: "png-sheet", t: "1 ảnh PNG tổng hợp", d: "Tất cả thẻ trên 1 ảnh dạng lưới 2 cột." },
];

async function captureOne(front: FrontData, back: BackData) {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(container);
  try {
    const fEl = makeFrontEl(front);
    container.appendChild(fEl);
    const f = await captureCardEl(fEl);
    container.removeChild(fEl);

    const bEl = makeBackEl(back);
    container.appendChild(bEl);
    const b = await captureCardEl(bEl);
    container.removeChild(bEl);

    return { front: f, back: b };
  } finally {
    document.body.removeChild(container);
  }
}

function EmployeeCardPage() {
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState<"front" | "back">("front");
  const [bulkFormat, setBulkFormat] = useState<BulkFormat>("pdf");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>("");

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const [front, setFront] = useState<FrontData>({
    name: "Nguyễn Văn A",
    nickname: "Văn A",
    dob: "01.01.1995",
    role: "Nhân viên",
    empCode: "NV-001",
    dept: "Phòng kinh doanh",
    company: "Cinnamon Forest",
  });
  const [back, setBack] = useState<BackData>({
    company: "Cinnamon Forest",
    terms: "Thẻ này có hiệu lực đến hết năm 2026. Nếu tìm thấy, vui lòng liên hệ công ty hoặc trả lại cho người sở hữu.",
    phone: "0901 234 567",
    instagram: "@cinnamonforest",
    whatsapp: "+84 901 234 567",
    wechat: "cinnamonforest",
    fanpageUrl: "https://facebook.com/cinnamonforest",
    whatsappUrl: "https://wa.me/84901234567",
  });

  // Render preview via innerHTML using the template (so preview === exported image)
  useEffect(() => {
    if (frontRef.current) {
      frontRef.current.innerHTML = "";
      const el = makeFrontEl(front);
      el.style.border = "none";
      el.style.borderRadius = "20px";
      frontRef.current.appendChild(el);
    }
  }, [front]);

  useEffect(() => {
    if (backRef.current) {
      backRef.current.innerHTML = "";
      const el = makeBackEl(back);
      el.style.border = "none";
      el.style.borderRadius = "20px";
      backRef.current.appendChild(el);
    }
  }, [back]);

  useEffect(() => {
    scheduleApi.getEmployees().then((r) => setEmployees(r.data || [])).catch(console.error);
  }, []);

  const safeFile = useMemo(() => front.name.replace(/\s+/g, "_"), [front.name]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoUrl(result); // base64 data URL
      setFront((f) => ({ ...f, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  // ── Single-card export ────────────────────────────────────────────────────
  const exportPNG = async (side: "front" | "back") => {
    const { front: f, back: b } = await captureOne(front, back);
    const url = side === "front" ? f : b;
    const a = document.createElement("a");
    a.download = `the-${safeFile}-${side}.png`;
    a.href = url;
    a.click();
  };

  const exportPDF = async () => {
    const { front: f, back: b } = await captureOne(front, back);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [PDF_W, PDF_H] });
    pdf.addImage(f, "PNG", 0, 0, PDF_W, PDF_H);
    pdf.addPage([PDF_W, PDF_H], "portrait");
    pdf.addImage(b, "PNG", 0, 0, PDF_W, PDF_H);
    pdf.save(`the-${safeFile}.pdf`);
  };

  // ── Bulk export ───────────────────────────────────────────────────────────
  const captureAll = async (onProgress: (m: string) => void) => {
    const res = await scheduleApi.getEmployees();
    const emps: any[] = res.data || [];
    if (!emps.length) {
      alert("Không có nhân viên nào!");
      return null;
    }

    const out: { name: string; front: string; back: string }[] = [];
    for (let i = 0; i < emps.length; i++) {
      const emp = emps[i];
      onProgress(`Xuất ${i + 1}/${emps.length}: ${emp.fullName}`);
      const { front: f, back: b } = await captureOne(
        {
          name: emp.fullName,
          empCode: emp.employeeCode || String(emp._id).slice(-8).toUpperCase(),
          role: emp.position || "Nhân viên",
          dept: front.dept,
          company: front.company,
        },
        back,
      );
      out.push({ name: emp.fullName, front: f, back: b });
    }
    return out;
  };

  const doExportPDF = async (cards: { front: string; back: string }[]) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [PDF_W, PDF_H] });
    cards.forEach(({ front: f, back: b }, i) => {
      if (i > 0) pdf.addPage([PDF_W, PDF_H], "portrait");
      pdf.addImage(f, "PNG", 0, 0, PDF_W, PDF_H);
      pdf.addPage([PDF_W, PDF_H], "portrait");
      pdf.addImage(b, "PNG", 0, 0, PDF_W, PDF_H);
    });
    pdf.save("the-nhanvien-tatca.pdf");
  };

  const doExportZip = async (cards: { name: string; front: string; back: string }[]) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    cards.forEach(({ name, front: f, back: b }, i) => {
      const safe = name.replace(/\s+/g, "_");
      zip.file(`${i + 1}_${safe}_mat-truoc.png`, f.split(",")[1], { base64: true });
      zip.file(`${i + 1}_${safe}_mat-sau.png`, b.split(",")[1], { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "the-nhanvien-tatca.zip";
    a.click();
  };

  const doExportSheet = async (cards: { front: string; back: string }[]) => {
    const W = CARD_W * 3;
    const H = CARD_H * 3;
    const GAP = 24;
    const PAD = 32;
    const rows = cards.length;
    const cw = PAD * 2 + W * 2 + GAP;
    const ch = PAD * 2 + rows * H + (rows - 1) * GAP;

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, cw, ch);

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = src;
      });

    for (let i = 0; i < cards.length; i++) {
      const { front: f, back: b } = cards[i];
      const y = PAD + i * (H + GAP);
      const [imgF, imgB] = await Promise.all([loadImg(f), loadImg(b)]);
      ctx.drawImage(imgF, PAD, y, W, H);
      ctx.drawImage(imgB, PAD + W + GAP, y, W, H);
    }

    const a = document.createElement("a");
    a.download = "the-nhanvien-tatca.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const exportAll = async () => {
    setBulkBusy(true);
    try {
      setBulkProgress("Đang tải danh sách nhân viên...");
      const cards = await captureAll(setBulkProgress);
      if (!cards) return;
      setBulkProgress("Đang tạo file...");
      if (bulkFormat === "pdf") await doExportPDF(cards);
      else if (bulkFormat === "png-zip") await doExportZip(cards);
      else await doExportSheet(cards);
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi xuất: " + err);
    } finally {
      setBulkBusy(false);
      setBulkProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader title="Employee Card" description="Thiết kế và xuất thẻ nhân viên" backTo="/" />

      <div className="min-h-screen bg-white px-4 py-10">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
          .scene{width:${CARD_W}px;height:${CARD_H}px;perspective:1400px;cursor:pointer;filter:drop-shadow(0 12px 32px rgba(139,26,56,.22))}
          .inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.4,0,.2,1)}
          .flipped .inner{transform:rotateY(180deg)}
          .face{position:absolute;inset:0;border-radius:20px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#FAFAFA;border:1.5px solid #ddd}
          .face.back{transform:rotateY(180deg)}
        `}</style>

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
          {/* PREVIEW */}
          <div className="flex flex-col items-center gap-4">
            <div className={`scene ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
              <div className="inner">
                <div className="face" ref={frontRef} />
                <div className="face back" ref={backRef} />
              </div>
            </div>

            <p className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 text-[10px]">↻</span>
              Nhấn vào thẻ để lật
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => exportPNG("front")} className="flex items-center gap-1.5 rounded-lg border border-[#E8C0CC] bg-[#F8EDF0] px-3 py-2 text-[11px] font-medium text-[#8B1A38] transition hover:bg-[#E8C0CC]">
                🖼 PNG mặt trước
              </button>
              <button onClick={() => exportPNG("back")} className="flex items-center gap-1.5 rounded-lg border border-[#E8C0CC] bg-[#F8EDF0] px-3 py-2 text-[11px] font-medium text-[#8B1A38] transition hover:bg-[#E8C0CC]">
                🖼 PNG mặt sau
              </button>
              <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg bg-[#8B1A38] px-3 py-2 text-[11px] font-medium text-white transition hover:bg-[#6A1229]">
                📄 PDF thẻ này
              </button>
            </div>

            {/* Bulk */}
            {/* <div className="mt-2 w-full max-w-[420px] rounded-2xl border-2 border-[#E8C0CC] bg-gradient-to-br from-[#F8EDF0] to-white p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#8B1A38]">
                📦 Tải tất cả thẻ ({employees.length} nhân viên)
              </p>
              <div className="mb-3 grid grid-cols-1 gap-2">
                {BULK_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setBulkFormat(o.v)}
                    className={`text-left rounded-lg border-2 p-2.5 transition ${bulkFormat === o.v
                      ? "border-[#8B1A38] bg-[#E8C0CC]/40"
                      : "border-[#E8C0CC] bg-white hover:border-[#8B1A38]"
                      }`}
                  >
                    <div className="text-[12px] font-semibold text-[#1A0A10]">{o.t}</div>
                    <div className="text-[10px] text-[#8B1A38]/70">{o.d}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={exportAll}
                disabled={bulkBusy || employees.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#8B1A38] px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#6A1229] disabled:opacity-50"
              >
                {bulkBusy
                  ? <><span className="animate-spin inline-block">⏳</span> {bulkProgress}</>
                  : "📥 Tải xuống tất cả"
                }
              </button>
            </div> */}
          </div>

          {/* FORM */}
          <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#E8C0CC] bg-white">
            <div className="flex">
              <button onClick={() => setTab("front")} className={`flex-1 py-3 text-[11px] font-medium tracking-[0.5px] transition ${tab === "front" ? "bg-[#8B1A38] text-white" : "bg-white text-gray-400"}`}>Mặt trước</button>
              <button onClick={() => setTab("back")} className={`flex-1 py-3 text-[11px] font-medium tracking-[0.5px] transition ${tab === "back" ? "bg-[#8B1A38] text-white" : "bg-white text-gray-400"}`}>Mặt sau</button>
            </div>
            <div className="p-5">
              {tab === "front" && (
                <div>
                  <div className="mb-4">
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.8px] text-gray-400">
                      Logo công ty
                    </label>
                    <div className="flex items-center gap-3">
                      {/* Preview logo nhỏ */}
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="logo"
                          className="h-12 w-12 rounded-full border border-[#E8C0CC] object-contain bg-white"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E8C0CC] bg-[#F8EDF0]">
                          <span className="text-[10px] text-[#8B1A38]">Logo</span>
                        </div>
                      )}
                      <label className="cursor-pointer rounded-lg border border-[#E8C0CC] bg-[#F8EDF0] px-3 py-2 text-[11px] font-medium text-[#8B1A38] transition hover:bg-[#E8C0CC]">
                        📁 Chọn ảnh
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {logoUrl && (
                        <button
                          onClick={() => {
                            setLogoUrl("");
                            setFront((f) => ({ ...f, logoUrl: "" }));
                          }}
                          className="text-[11px] text-gray-400 hover:text-red-500"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mb-4 text-[10px] uppercase tracking-[1px] text-[#8B1A38]">Thông tin nhân viên</p>
                  <Field label="Họ và tên" value={front.name} onChange={(v) => setFront({ ...front, name: v })} />
                  <Field label="Bí danh" value={front.nickname || ""} onChange={(v) => setFront({ ...front, nickname: v })} />
                  <Field label="Ngày sinh" value={front.dob || ""} onChange={(v) => setFront({ ...front, dob: v })} />
                  <Field label="Mã nhân viên" value={front.empCode} onChange={(v) => setFront({ ...front, empCode: v })} />
                  <Field label="Chức vụ" value={front.role} onChange={(v) => setFront({ ...front, role: v })} />
                  <Field label="Phòng ban" value={front.dept || ""} onChange={(v) => setFront({ ...front, dept: v })} />
                  <Field label="Tên công ty (dải bên)" value={front.company || ""} onChange={(v) => setFront({ ...front, company: v })} />
                </div>
              )}
              {tab === "back" && (
                <div>
                  <p className="mb-4 text-[10px] uppercase tracking-[1px] text-[#8B1A38]">Thông tin liên hệ</p>
                  <Field label="Tên công ty (đầu thẻ)" value={back.company || ""} onChange={(v) => setBack({ ...back, company: v })} />
                  <Field label="Điều khoản" value={back.terms || ""} onChange={(v) => setBack({ ...back, terms: v })} multiline />
                  <Field label="Số điện thoại" value={back.phone || ""} onChange={(v) => setBack({ ...back, phone: v })} />
                  <Field label="Instagram" value={back.instagram || ""} onChange={(v) => setBack({ ...back, instagram: v })} />
                  <Field label="WhatsApp" value={back.whatsapp || ""} onChange={(v) => setBack({ ...back, whatsapp: v })} />
                  <Field label="WeChat" value={back.wechat || ""} onChange={(v) => setBack({ ...back, wechat: v })} />
                  <Field label="Fanpage URL (QR)" value={back.fanpageUrl || ""} onChange={(v) => setBack({ ...back, fanpageUrl: v })} />
                  <Field label="WhatsApp URL (QR)" value={back.whatsappUrl || ""} onChange={(v) => setBack({ ...back, whatsappUrl: v })} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-[10px] uppercase tracking-[0.8px] text-gray-400">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#E8C0CC] px-3 py-2 text-[12.5px] text-[#1A0A10] outline-none transition focus:border-[#8B1A38] resize-vertical"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[#E8C0CC] px-3 py-2 text-[12.5px] text-[#1A0A10] outline-none transition focus:border-[#8B1A38]"
        />
      )}
    </div>
  );
}
