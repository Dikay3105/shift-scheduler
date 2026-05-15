import AdminHeader from "@/components/AdminHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { jsPDF } from "jspdf";
import { scheduleApi } from "@/services/api";

export const Route = createFileRoute("/employeeCard")({
    component: EmployeeCardPage,
});

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
    name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || "").slice(-2).join("");

const mirrorImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
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

const captureEl = async (el: HTMLElement): Promise<string> => {
    const { toPng } = await import("html-to-image");
    await new Promise((r) => setTimeout(r, 120));
    return toPng(el, { pixelRatio: 3, backgroundColor: "#FFFAF8", width: 350, height: 230 });
};

function makeFrontEl(name: string, role: string, empCode: string): HTMLDivElement {
    const el = document.createElement("div");
    el.style.cssText = "width:350px;height:230px;border-radius:18px;overflow:hidden;background:#FFFAF8;border:1px solid #FFADD0;display:flex;flex-direction:column;font-family:Georgia,serif;box-sizing:border-box";
    const ini = getInitials(name);
    el.innerHTML = `
<div style="background:linear-gradient(to right,#E8607A,#CC4070,#A8305C);padding:10px 16px;display:flex;align-items:center;gap:10px;overflow:hidden;flex-shrink:0">
  <div style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" width="16" height="16"><path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"/><path d="M12 12v8M9 16c1-1.5 4-1.5 6 0"/></svg>
  </div>
  <div style="flex:1;min-width:0">
    <p style="color:white;font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Cinnamon Forest</p>
  </div>
  <span style="background:rgba(0,0,0,.15);color:rgba(255,255,255,.8);font-size:8px;padding:3px 8px;border-radius:6px;letter-spacing:1px;text-transform:uppercase;flex-shrink:0">2024–2026</span>
</div>
<div style="flex:1;display:flex;align-items:center;gap:16px;padding:12px 16px;overflow:hidden">
  <div style="position:relative;width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#F9C6D5,#E88AAE);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;color:#922054;flex-shrink:0;border:2.5px solid white;box-shadow:0 0 0 1.5px #FFADD0">
    ${ini}
    <div style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:50%;background:#FFFAF8;border:1px solid #FFADD0;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 24 24" fill="none" stroke="#C04060" stroke-width="2" width="12" height="12"><path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"/></svg>
    </div>
  </div>
  <div style="flex:1;min-width:0">
    <p style="font-size:20px;font-weight:600;color:#4A0F2A;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</p>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#E0528A;margin:0 0 10px;font-family:sans-serif">${role || "Nhân viên"}</p>
    <div style="display:inline-flex;border-radius:8px;border:1px solid #FFD6E7;overflow:hidden;background:#FFF0F5">
      <span style="background:#FFD6E7;padding:4px 8px;font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.8px;color:#922054;font-family:sans-serif">ID</span>
      <span style="padding:4px 12px;font-size:11px;font-weight:500;letter-spacing:1.2px;color:#4A0F2A;font-family:sans-serif">${empCode}</span>
    </div>
  </div>
</div>
<div style="height:30px;background:linear-gradient(to right,#CC4070,#E8607A);display:flex;align-items:center;justify-content:space-between;padding:0 16px;flex-shrink:0">
  <div style="display:flex;gap:4px">
    <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)"></div>
    <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)"></div>
    <div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)"></div>
  </div>
  <span style="font-size:8.5px;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,.85);font-family:sans-serif">Nhân viên chính thức</span>
  <span style="font-size:10px;color:rgba(255,255,255,.6)">✦</span>
</div>`;
    return el;
}

function makeBackEl(addr: string, phone: string, email: string, web: string): HTMLDivElement {
    const el = document.createElement("div");
    el.style.cssText = "width:350px;height:230px;border-radius:18px;overflow:hidden;background:#FFFAF8;border:1px solid #FFADD0;display:flex;flex-direction:column;position:relative;font-family:sans-serif;box-sizing:border-box";
    const row = (svg: string, text: string) => `
<div style="display:flex;align-items:flex-start;gap:6px">
  <div style="width:18px;height:18px;border-radius:5px;border:1px solid #FFD6E7;background:#FFF0F5;display:flex;align-items:center;justify-content:center;flex-shrink:0">${svg}</div>
  <span style="font-size:10px;color:#4A0F2A;line-height:1.5;word-break:break-all">${text}</span>
</div>`;
    el.innerHTML = `
<div style="height:36px;background:linear-gradient(to right,#E8607A,#A8305C);display:flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"/></svg>
  <span style="font-family:Georgia,serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:white">Cinnamon Forest</span>
</div>
<div style="display:flex;gap:12px;padding:12px 16px;flex:1;overflow:hidden">
  <div style="flex:1;min-width:0">
    <p style="font-size:8.5px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#F472A8;margin:0 0 10px">Liên hệ công ty</p>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z"/><circle cx="8" cy="6" r="1.5"/></svg>', addr)}
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><path d="M3 3h2.5l1 3L5 7.5s.9 2.1 3.5 3.5L10 9.5l3 1V13c-6.5 1-11.5-6-10-10z"/></svg>', phone)}
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M2 5l6 5 6-5"/></svg>', email)}
      ${row('<svg viewBox="0 0 16 16" fill="none" stroke="#C04060" stroke-width="1.5" width="9" height="9"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5C6.5 5 6 6.5 6 8s.5 3 2 5.5M8 2.5C9.5 5 10 6.5 10 8s-.5 3-2 5.5M2.5 8h11"/></svg>', web)}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
    <div style="width:74px;height:74px;border-radius:10px;border:1px solid #FFD6E7;background:white;padding:4px;display:flex;align-items:center;justify-content:center">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=https://cinnamonforest.com&color=922054&bgcolor=FFFFFF" width="66" height="66"/>
    </div>
    <span style="font-size:7.5px;text-transform:uppercase;letter-spacing:.8px;color:#F472A8">Website</span>
  </div>
</div>
<div style="position:absolute;bottom:0;left:0;right:0;height:12px;background:linear-gradient(to right,#A8305C,#E8607A)"></div>`;
    return el;
}

// ─── Component ────────────────────────────────────────────────────────────────

type BulkFormat = "pdf" | "png-zip" | "png-sheet";

const BULK_OPTIONS: { v: BulkFormat; t: string; d: string }[] = [
    { v: "pdf", t: "PDF 2 mặt", d: "Mỗi NV 2 trang (trước + sau), in 2 mặt." },
    { v: "png-zip", t: "ZIP nhiều ảnh PNG", d: "Mỗi NV 2 file PNG (trước/sau) trong 1 file ZIP." },
    { v: "png-sheet", t: "1 ảnh PNG tổng hợp", d: "Tất cả thẻ trên 1 ảnh dạng lưới 2 cột." },
];

function EmployeeCardPage() {
    const [flipped, setFlipped] = useState(false);
    const [tab, setTab] = useState<"front" | "back">("front");
    const [bulkFormat, setBulkFormat] = useState<BulkFormat>("pdf");
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkProgress, setBulkProgress] = useState("");
    const [employees, setEmployees] = useState<any[]>([]);

    const frontRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLDivElement>(null);

    const [front, setFront] = useState({ name: "Nguyễn Văn A", role: "Nhân viên", id: "CF-2024-001" });
    const [back, setBack] = useState({ addr: "123 Nguyễn Huệ, Q.1, TP.HCM", phone: "+84 28 3822 0000", email: "hello@cinnamonforest.com", web: "cinnamonforest.com" });

    const initials = useMemo(() => getInitials(front.name), [front.name]);

    useEffect(() => {
        scheduleApi.getEmployees().then((r) => setEmployees(r.data || [])).catch(console.error);
    }, []);

    // ── Capture thẻ preview (1 nhân viên) ────────────────────────────────────
    const captureCard = async (side: "front" | "back") => {
        const wasFlipped = flipped;
        if (side === "back" && !flipped) setFlipped(true);
        if (side === "front" && flipped) setFlipped(false);
        await new Promise((r) => setTimeout(r, 800));

        const ref = side === "front" ? frontRef.current : backRef.current;
        if (!ref) return null;

        const parent = ref.parentElement;
        if (parent) { parent.style.transition = "none"; parent.style.transform = side === "back" ? "rotateY(180deg)" : "none"; }
        ref.style.backfaceVisibility = "visible";
        ref.style.webkitBackfaceVisibility = "visible";
        await new Promise((r) => setTimeout(r, 60));

        const { toPng } = await import("html-to-image");
        let url = await toPng(ref, { pixelRatio: 3, backgroundColor: "#FFFAF8", width: ref.offsetWidth, height: ref.offsetHeight });
        if (side === "back") url = await mirrorImage(url);

        ref.style.backfaceVisibility = "";
        ref.style.webkitBackfaceVisibility = "";
        if (parent) { parent.style.transform = wasFlipped ? "rotateY(180deg)" : ""; parent.style.transition = ""; }
        if (wasFlipped !== flipped) setFlipped(wasFlipped);
        return url;
    };

    const exportPNG = async (side: "front" | "back") => {
        const url = await captureCard(side);
        if (!url) return;
        const a = document.createElement("a");
        a.download = `the-${front.name.replace(/\s/g, "_")}-${side}.png`;
        a.href = url; a.click();
    };

    const exportPDF = async () => {
        const f = await captureCard("front");
        const b = await captureCard("back");
        if (!f || !b) return;
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
        pdf.addImage(f, "PNG", 0, 0, 85.6, 54);
        pdf.addPage([85.6, 54], "landscape");
        pdf.addImage(b, "PNG", 0, 0, 85.6, 54);
        pdf.save(`the-${front.name.replace(/\s/g, "_")}.pdf`);
    };

    // ── Capture tất cả nhân viên, trả về mảng {front, back} dataUrl ──────────
    const captureAllEmployees = async (onProgress: (msg: string) => void) => {
        const res = await scheduleApi.getEmployees();
        const emps: any[] = res.data || [];
        if (!emps.length) { alert("Không có nhân viên nào!"); return null; }

        const container = document.createElement("div");
        container.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none;";
        document.body.appendChild(container);

        const results: { name: string; front: string; back: string }[] = [];

        for (let i = 0; i < emps.length; i++) {
            const emp = emps[i];
            onProgress(`Xuất ${i + 1}/${emps.length}: ${emp.fullName}`);

            const frontEl = makeFrontEl(emp.fullName, emp.position, emp.employeeCode || emp._id.slice(-8).toUpperCase());
            container.appendChild(frontEl);
            const frontUrl = await captureEl(frontEl);
            container.removeChild(frontEl);

            const backEl = makeBackEl(back.addr, back.phone, back.email, back.web);
            container.appendChild(backEl);
            const backUrl = await captureEl(backEl);
            container.removeChild(backEl);

            results.push({ name: emp.fullName, front: frontUrl, back: backUrl });
        }

        document.body.removeChild(container);
        return results;
    };

    // ── Export: PDF ───────────────────────────────────────────────────────────
    const doExportPDF = async (cards: { name: string; front: string; back: string }[]) => {
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
        cards.forEach(({ front: f, back: b }, i) => {
            if (i > 0) pdf.addPage([85.6, 54], "landscape");
            pdf.addImage(f, "PNG", 0, 0, 85.6, 54);
            pdf.addPage([85.6, 54], "landscape");
            pdf.addImage(b, "PNG", 0, 0, 85.6, 54);
        });
        pdf.save("the-nhanvien-tatca.pdf");
    };

    // ── Export: ZIP PNG ───────────────────────────────────────────────────────
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

    // ── Export: PNG Sheet (lưới 2 cột: trước | sau) ───────────────────────────
    const doExportSheet = async (cards: { name: string; front: string; back: string }[]) => {
        const CARD_W = 350, CARD_H = 230, GAP = 16, PAD = 24;
        const COLS = 2; // mỗi hàng: mặt trước bên trái, mặt sau bên phải
        const rows = cards.length;
        const W = PAD * 2 + CARD_W * COLS + GAP;
        const H = PAD * 2 + rows * CARD_H + (rows - 1) * GAP;

        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d")!;

        // Nền trắng
        ctx.fillStyle = "#FFFAF8";
        ctx.fillRect(0, 0, W, H);

        const loadImg = (src: string): Promise<HTMLImageElement> =>
            new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.src = src; });

        for (let i = 0; i < cards.length; i++) {
            const { front: f, back: b } = cards[i];
            const y = PAD + i * (CARD_H + GAP);
            const imgF = await loadImg(f);
            const imgB = await loadImg(b);
            ctx.drawImage(imgF, PAD, y, CARD_W, CARD_H);
            ctx.drawImage(imgB, PAD + CARD_W + GAP, y, CARD_W, CARD_H);
        }

        const a = document.createElement("a");
        a.download = "the-nhanvien-tatca.png";
        a.href = canvas.toDataURL("image/png");
        a.click();
    };

    // ── Main bulk export handler ──────────────────────────────────────────────
    const exportAllEmployeeCards = async () => {
        setBulkBusy(true);
        try {
            setBulkProgress("Đang tải danh sách nhân viên...");
            const cards = await captureAllEmployees(setBulkProgress);
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
            <AdminHeader title="Employee Card" description="Thiết kế và quản lý thẻ nhân viên" backTo="/" />

            <div className="min-h-screen bg-white px-4 py-10">
                <style>{`
                :root { --rose-200:#FFADD0; --cream:#FFFAF8; }
                .scene{width:350px;height:230px;perspective:1200px;cursor:pointer;filter:drop-shadow(0 12px 32px rgba(180,60,100,.18))}
                .inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .75s cubic-bezier(.4,0,.2,1)}
                .flipped .inner{transform:rotateY(180deg)}
                .face{position:absolute;inset:0;border-radius:18px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden}
                .front{background:var(--cream);border:1px solid var(--rose-200)}
                .back{background:var(--cream);border:1px solid var(--rose-200);transform:rotateY(180deg)}
                `}</style>

                <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">

                    {/* ── CARD PREVIEW + EXPORT ── */}
                    <div className="flex flex-col items-center gap-4">

                        {/* Thẻ lật */}
                        <div className={`scene ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
                            <div className="inner">
                                {/* FRONT */}
                                <div className="face front" ref={frontRef}>
                                    <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#E8607A] via-[#CC4070] to-[#A8305C] px-4 py-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/20">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-4 w-4"><path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" /><path d="M12 12v8M9 16c1-1.5 4-1.5 6 0" /></svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-serif text-[15px] font-semibold uppercase tracking-[2px] text-white">Cinnamon Forest</p>
                                        </div>
                                        <span className="shrink-0 whitespace-nowrap rounded-md bg-black/15 px-2 py-1 text-[8px] uppercase tracking-[1px] text-white/80">2024–2026</span>
                                        <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/10" />
                                    </div>
                                    <div className="flex h-[140px] items-center gap-4 px-4 py-3">
                                        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#F9C6D5] to-[#E88AAE] font-serif text-[28px] font-semibold text-[#922054] shadow-[0_0_0_1.5px_#FFADD0]">
                                            {initials}
                                            <div className="absolute bottom-[-2px] right-[-2px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#FFADD0] bg-[#FFFAF8]">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="#C04060" strokeWidth="2" className="h-3 w-3"><path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" /></svg>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-serif text-[20px] font-semibold leading-tight text-[#4A0F2A]">{front.name}</p>
                                            <p className="mb-3 mt-1 text-[10px] uppercase tracking-[1.2px] text-[#E0528A]">{front.role}</p>
                                            <div className="flex w-fit items-center overflow-hidden rounded-lg border border-[#FFD6E7] bg-[#FFF0F5]">
                                                <span className="bg-[#FFD6E7] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.8px] text-[#922054]">ID</span>
                                                <span className="px-3 py-1 text-[11px] font-medium tracking-[1.2px] text-[#4A0F2A]">{front.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex h-[30px] items-center justify-between bg-gradient-to-r from-[#CC4070] to-[#E8607A] px-4">
                                        <div className="flex gap-1">
                                            <div className="h-[5px] w-[5px] rounded-full bg-white/50" />
                                            <div className="h-[5px] w-[5px] rounded-full bg-white/50" />
                                            <div className="h-[5px] w-[5px] rounded-full bg-white/50" />
                                        </div>
                                        <span className="text-[8.5px] uppercase tracking-[2.5px] text-white/85">Nhân viên chính thức</span>
                                        <span className="text-[10px] text-white/60">✦</span>
                                    </div>
                                </div>

                                {/* BACK */}
                                <div className="face back" ref={backRef}>
                                    <div className="flex h-9 items-center justify-center gap-2 bg-gradient-to-r from-[#E8607A] to-[#A8305C]">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" /></svg>
                                        <span className="font-serif text-[12px] font-semibold uppercase tracking-[3px] text-white">Cinnamon Forest</span>
                                    </div>
                                    <div className="flex gap-3 px-4 pt-3">
                                        <div className="flex-1">
                                            <p className="mb-3 text-[8.5px] font-medium uppercase tracking-[1px] text-[#F472A8]">Liên hệ công ty</p>
                                            <div className="space-y-2">
                                                <InfoRow type="address" text={back.addr} />
                                                <InfoRow type="phone" text={back.phone} />
                                                <InfoRow type="email" text={back.email} />
                                                <InfoRow type="web" text={back.web} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-[10px] border border-[#FFD6E7] bg-white p-1">
                                                <QRCode value="https://cinnamonforest.com" size={66} style={{ height: "66px", width: "66px" }} fgColor="#922054" bgColor="#FFFFFF" />
                                            </div>
                                            <span className="text-[7.5px] uppercase tracking-[0.8px] text-[#F472A8]">Website</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-[#A8305C] to-[#E8607A]" />
                                </div>
                            </div>
                        </div>

                        <p className="flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 text-[10px]">↻</span>
                            Nhấn vào thẻ để lật
                        </p>

                        {/* Xuất thẻ preview */}
                        <div className="flex flex-wrap justify-center gap-2">
                            <button onClick={() => exportPNG("front")} className="flex items-center gap-1.5 rounded-lg border border-[#FFD6E7] bg-[#FFF0F5] px-3 py-2 text-[11px] font-medium text-[#922054] transition hover:bg-[#FFD6E7]">
                                🖼 PNG mặt trước
                            </button>
                            <button onClick={() => exportPNG("back")} className="flex items-center gap-1.5 rounded-lg border border-[#FFD6E7] bg-[#FFF0F5] px-3 py-2 text-[11px] font-medium text-[#922054] transition hover:bg-[#FFD6E7]">
                                🖼 PNG mặt sau
                            </button>
                            <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8607A] to-[#A8305C] px-3 py-2 text-[11px] font-medium text-white transition hover:opacity-90">
                                📄 PDF thẻ này
                            </button>
                        </div>

                        {/* ── Bulk export ── */}
                        <div className="mt-2 w-full max-w-[420px] rounded-2xl border-2 border-[#FFD6E7] bg-gradient-to-br from-[#FFF0F5] to-white p-4">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#922054]">
                                📦 Tải tất cả thẻ ({employees.length} nhân viên)
                            </p>
                            <div className="mb-3 grid grid-cols-1 gap-2">
                                {BULK_OPTIONS.map((o) => (
                                    <button
                                        key={o.v}
                                        onClick={() => setBulkFormat(o.v)}
                                        className={`text-left rounded-lg border-2 p-2.5 transition ${bulkFormat === o.v
                                                ? "border-[#E0528A] bg-[#FFD6E7]/40"
                                                : "border-[#FFD6E7] bg-white hover:border-[#F472A8]"
                                            }`}
                                    >
                                        <div className="text-[12px] font-semibold text-[#4A0F2A]">{o.t}</div>
                                        <div className="text-[10px] text-[#922054]/70">{o.d}</div>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={exportAllEmployeeCards}
                                disabled={bulkBusy || employees.length === 0}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8607A] to-[#A8305C] px-3 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                                {bulkBusy
                                    ? <><span className="animate-spin inline-block">⏳</span> {bulkProgress}</>
                                    : "📥 Tải xuống tất cả"
                                }
                            </button>
                        </div>
                    </div>

                    {/* ── FORM ── */}
                    <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#FFD6E7] bg-white">
                        <div className="flex">
                            <button onClick={() => setTab("front")} className={`flex-1 py-3 text-[11px] font-medium tracking-[0.5px] transition ${tab === "front" ? "bg-gradient-to-r from-[#E8607A] to-[#A8305C] text-white" : "bg-white text-gray-400"}`}>Mặt trước</button>
                            <button onClick={() => setTab("back")} className={`flex-1 py-3 text-[11px] font-medium tracking-[0.5px] transition ${tab === "back" ? "bg-gradient-to-r from-[#E8607A] to-[#A8305C] text-white" : "bg-white text-gray-400"}`}>Mặt sau</button>
                        </div>
                        <div className="p-5">
                            {tab === "front" && (
                                <div>
                                    <p className="mb-4 text-[10px] uppercase tracking-[1px] text-[#F472A8]">Thông tin nhân viên</p>
                                    <Field label="Họ và tên" value={front.name} onChange={(v) => setFront({ ...front, name: v })} />
                                    <Field label="Chức vụ" value={front.role} onChange={(v) => setFront({ ...front, role: v })} />
                                    <Field label="Mã nhân viên" value={front.id} onChange={(v) => setFront({ ...front, id: v })} />
                                </div>
                            )}
                            {tab === "back" && (
                                <div>
                                    <p className="mb-4 text-[10px] uppercase tracking-[1px] text-[#F472A8]">Thông tin liên hệ</p>
                                    <Field label="Địa chỉ" value={back.addr} onChange={(v) => setBack({ ...back, addr: v })} />
                                    <Field label="Số điện thoại" value={back.phone} onChange={(v) => setBack({ ...back, phone: v })} />
                                    <Field label="Email" value={back.email} onChange={(v) => setBack({ ...back, email: v })} />
                                    <Field label="Website" value={back.web} onChange={(v) => setBack({ ...back, web: v })} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="mb-4">
            <label className="mb-1 block text-[10px] uppercase tracking-[0.8px] text-gray-400">{label}</label>
            <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[#FFD6E7] px-3 py-2 text-[12.5px] text-[#4A0F2A] outline-none transition focus:border-[#F472A8]" />
        </div>
    );
}

function InfoRow({ text, type }: { text: string; type: "address" | "phone" | "email" | "web" }) {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-[#FFD6E7] bg-[#FFF0F5]">
                {type === "address" && <svg viewBox="0 0 16 16" fill="none" stroke="#C04060" strokeWidth="1.5" className="h-[9px] w-[9px]"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z" /><circle cx="8" cy="6" r="1.5" /></svg>}
                {type === "phone" && <svg viewBox="0 0 16 16" fill="none" stroke="#C04060" strokeWidth="1.5" className="h-[9px] w-[9px]"><path d="M3 3h2.5l1 3L5 7.5s.9 2.1 3.5 3.5L10 9.5l3 1V13c-6.5 1-11.5-6-10-10z" /></svg>}
                {type === "email" && <svg viewBox="0 0 16 16" fill="none" stroke="#C04060" strokeWidth="1.5" className="h-[9px] w-[9px]"><rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M2 5l6 5 6-5" /></svg>}
                {type === "web" && <svg viewBox="0 0 16 16" fill="none" stroke="#C04060" strokeWidth="1.5" className="h-[9px] w-[9px]"><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5C6.5 5 6 6.5 6 8s.5 3 2 5.5M8 2.5C9.5 5 10 6.5 10 8s-.5 3-2 5.5M2.5 8h11" /></svg>}
            </div>
            <span className="break-words text-[10px] leading-[1.5] text-[#4A0F2A]">{text}</span>
        </div>
    );
}
