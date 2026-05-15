import AdminHeader from "@/components/AdminHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { scheduleApi } from "@/services/api";
export const Route = createFileRoute("/employeeCard")({
    component: EmployeeCardPage,
});

function EmployeeCardPage() {
    const [flipped, setFlipped] = useState(false);
    const [tab, setTab] = useState<"front" | "back">("front");
    const frontRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLDivElement>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [bulkFormat, setBulkFormat] = useState<"pdf" | "png-zip" | "png-sheet">("pdf");
    const [bulkBusy, setBulkBusy] = useState(false);

    const [front, setFront] = useState({
        name: "Nguyễn Văn A",
        role: "Nhân viên",
        id: "CF-2024-001",
    });

    const [back, setBack] = useState({
        addr: "123 Nguyễn Huệ, Q.1, TP.HCM",
        phone: "+84 28 3822 0000",
        email: "hello@cinnamonforest.com",
        web: "cinnamonforest.com",
    });

    const mirrorImage = async (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d")!;
                ctx.translate(img.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.src = dataUrl;
        });
    };

    const captureCard = async (side: "front" | "back") => {
        const { toPng } = await import("html-to-image");

        const wasFlipped = flipped;
        if (side === "back" && !flipped) setFlipped(true);
        if (side === "front" && flipped) setFlipped(false);

        await new Promise(r => setTimeout(r, 800));

        const sourceRef = side === "front" ? frontRef.current : backRef.current;
        if (!sourceRef) return null;

        const parent = sourceRef.parentElement;
        if (parent) parent.style.transition = "none";
        if (parent) parent.style.transform = side === "back" ? "rotateY(180deg)" : "none";

        sourceRef.style.backfaceVisibility = "visible";
        sourceRef.style.webkitBackfaceVisibility = "visible";

        await new Promise(r => setTimeout(r, 50));

        let dataUrl = await toPng(sourceRef, {
            pixelRatio: 3,
            backgroundColor: "#FFFAF8",
            width: sourceRef.offsetWidth,
            height: sourceRef.offsetHeight,
        });

        // Mirror mặt sau sau khi capture
        if (side === "back") {
            dataUrl = await mirrorImage(dataUrl);
        }

        // Restore
        sourceRef.style.backfaceVisibility = "";
        sourceRef.style.webkitBackfaceVisibility = "";
        if (parent) {
            parent.style.transform = wasFlipped ? "rotateY(180deg)" : "";
            parent.style.transition = "";
        }
        if (wasFlipped !== flipped) setFlipped(wasFlipped);

        return dataUrl;
    };
    const exportPNG = async (side: "front" | "back") => {
        const dataUrl = await captureCard(side);
        if (!dataUrl) return;
        const link = document.createElement("a");
        link.download = `the-nhanvien-${front.name.replace(/\s/g, "_")}-${side}.png`;
        link.href = dataUrl;
        link.click();
    };

    const exportPDF = async () => {
        const frontDataUrl = await captureCard("front");
        const backDataUrl = await captureCard("back");
        if (!frontDataUrl || !backDataUrl) return;

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [85.6, 54],
        });

        pdf.addImage(frontDataUrl, "PNG", 0, 0, 85.6, 54);
        pdf.addPage([85.6, 54], "landscape");
        pdf.addImage(backDataUrl, "PNG", 0, 0, 85.6, 54);
        pdf.save(`the-nhanvien-${front.name.replace(/\s/g, "_")}.pdf`);
    };

    const exportAllEmployeeCards = async () => {
        if (!employees.length) return;
        setBulkBusy(true);
        try {
            const { toPng } = await import("html-to-image");

            // Capture all front + back canvases first
            const pairs: { name: string; frontPng: string; backPng: string }[] = [];
            for (const emp of employees) {
                const frontEl = document.getElementById(`export-front-${emp._id}`) as HTMLElement;
                const backEl = document.getElementById(`export-back-${emp._id}`) as HTMLElement;
                if (!frontEl || !backEl) continue;

                const frontPng = await toPng(frontEl, { pixelRatio: 3, backgroundColor: "#FFFAF8" });
                const backPng = await toPng(backEl, { pixelRatio: 3, backgroundColor: "#FFFAF8" });
                const safe = String(emp.fullName || emp.employeeCode || "nv").replace(/[^\p{L}\p{N}_-]+/gu, "_");
                pairs.push({ name: safe, frontPng, backPng });
            }

            if (bulkFormat === "pdf") {
                // 2 mặt: mỗi nhân viên 2 trang (mặt trước + mặt sau, mặt sau lật ngang để khi in 2 mặt sẽ khớp)
                const pdf = new jsPDF({
                    orientation: "landscape",
                    unit: "mm",
                    format: [85.6, 54],
                });
                for (let i = 0; i < pairs.length; i++) {
                    const { frontPng, backPng } = pairs[i];
                    if (i !== 0) pdf.addPage([85.6, 54], "landscape");
                    pdf.addImage(frontPng, "PNG", 0, 0, 85.6, 54);
                    pdf.addPage([85.6, 54], "landscape");
                    const mirroredBack = await mirrorImage(backPng);
                    pdf.addImage(mirroredBack, "PNG", 0, 0, 85.6, 54);
                }
                pdf.save("tat-ca-the-nhan-vien.pdf");
            } else if (bulkFormat === "png-zip") {
                const { default: JSZip } = await import("jszip");
                const zip = new JSZip();
                for (const p of pairs) {
                    zip.file(`${p.name}_mat-truoc.png`, p.frontPng.split(",")[1], { base64: true });
                    zip.file(`${p.name}_mat-sau.png`, p.backPng.split(",")[1], { base64: true });
                }
                const blob = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "tat-ca-the-nhan-vien.zip";
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // png-sheet: lưới 2 cột (mặt trước | mặt sau) cho mỗi nhân viên
                const loadImg = (src: string) =>
                    new Promise<HTMLImageElement>((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = src;
                    });
                const imgs = await Promise.all(
                    pairs.flatMap((p) => [loadImg(p.frontPng), loadImg(p.backPng)])
                );
                const cardW = imgs[0].width;
                const cardH = imgs[0].height;
                const gap = 24;
                const cols = 2;
                const rows = pairs.length;
                const sheetW = cols * cardW + (cols + 1) * gap;
                const sheetH = rows * cardH + (rows + 1) * gap;
                const sheet = document.createElement("canvas");
                sheet.width = sheetW;
                sheet.height = sheetH;
                const ctx = sheet.getContext("2d")!;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, sheetW, sheetH);
                for (let i = 0; i < pairs.length; i++) {
                    const front = imgs[i * 2];
                    const back = imgs[i * 2 + 1];
                    const y = gap + i * (cardH + gap);
                    ctx.drawImage(front, gap, y);
                    ctx.drawImage(back, gap * 2 + cardW, y);
                }
                const a = document.createElement("a");
                a.download = "tat-ca-the-nhan-vien.png";
                a.href = sheet.toDataURL("image/png");
                a.click();
            }
        } finally {
            setBulkBusy(false);
        }
    };

    const initials = useMemo(() => {
        return front.name
            .trim()
            .split(/\s+/)
            .map((w) => w[0]?.toUpperCase() || "")
            .slice(-2)
            .join("");
    }, [front.name]);

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const res = await scheduleApi.getEmployees();
                setEmployees(res.data || []);
            } catch (err) {
                console.error(err);
            }
        };

        loadEmployees();
    }, []);

    return (
        <div className="min-h-screen bg-muted/30">
            <AdminHeader
                title="Employee Card"
                description="Thiết kế và quản lý thẻ nhân viên"
                backTo="/"
            />

            <div className="min-h-screen bg-white px-4 py-10">
                <style>{`
        :root {
          --rose-50: #FFF0F5;
          --rose-100: #FFD6E7;
          --rose-200: #FFADD0;
          --rose-400: #F472A8;
          --rose-500: #E0528A;
          --rose-700: #922054;
          --rose-900: #4A0F2A;
          --cream: #FFFAF8;
        }

        .scene {
          width: 350px;
          height: 230px;
          perspective: 1200px;
          cursor: pointer;
          filter: drop-shadow(0 12px 32px rgba(180,60,100,.18));
        }

        .inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform .75s cubic-bezier(.4,0,.2,1);
        }

        .flipped .inner {
          transform: rotateY(180deg);
        }

        .face {
          position: absolute;
          inset: 0;
          border-radius: 18px;
          overflow: hidden;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .front {
          background: var(--cream);
          border: 1px solid var(--rose-200);
        }

        .back {
          background: var(--cream);
          border: 1px solid var(--rose-200);
          transform: rotateY(180deg);
        }
      `}</style>

                <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
                    {/* CARD */}
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className={`scene ${flipped ? "flipped" : ""}`}
                            onClick={() => setFlipped(!flipped)}
                        >
                            <div className="inner">
                                {/* FRONT */}
                                <div className="face front" ref={frontRef}>
                                    {/* Header */}
                                    <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#E8607A] via-[#CC4070] to-[#A8305C] px-4 py-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/20">
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="white"
                                                strokeWidth="1.8"
                                                className="h-4 w-4"
                                            >
                                                <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" />
                                                <path d="M12 12v8M9 16c1-1.5 4-1.5 6 0" />
                                            </svg>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-serif text-[15px] font-semibold uppercase tracking-[2px] text-white">
                                                Cinnamon Forest
                                            </p>
                                        </div>

                                        <span className="shrink-0 whitespace-nowrap rounded-md bg-black/15 px-2 py-1 text-[8px] uppercase tracking-[1px] text-white/80">
                                            2024–2026
                                        </span>

                                        <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/10" />
                                    </div>

                                    {/* Body */}
                                    <div className="flex h-[140px] items-center gap-4 px-4 py-3">
                                        {/* Avatar */}
                                        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-white bg-gradient-to-br from-[#F9C6D5] to-[#E88AAE] font-serif text-[28px] font-semibold text-[#922054] shadow-[0_0_0_1.5px_#FFADD0]">
                                            {initials}

                                            <div className="absolute bottom-[-2px] right-[-2px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#FFADD0] bg-[#FFFAF8]">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="#C04060"
                                                    strokeWidth="2"
                                                    className="h-3 w-3"
                                                >
                                                    <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-serif text-[20px] font-semibold leading-tight text-[#4A0F2A]">
                                                {front.name}
                                            </p>

                                            <p className="mb-3 mt-1 text-[10px] uppercase tracking-[1.2px] text-[#E0528A]">
                                                {front.role}
                                            </p>

                                            <div className="flex w-fit items-center overflow-hidden rounded-lg border border-[#FFD6E7] bg-[#FFF0F5]">
                                                <span className="bg-[#FFD6E7] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.8px] text-[#922054]">
                                                    ID
                                                </span>

                                                <span className="px-3 py-1 text-[11px] font-medium tracking-[1.2px] text-[#4A0F2A]">
                                                    {front.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex h-[30px] items-center justify-between bg-gradient-to-r from-[#CC4070] to-[#E8607A] px-4">
                                        <div className="flex gap-1">
                                            <div className="h-[5px] w-[5px] rounded-full bg-white/50" />
                                            <div className="h-[5px] w-[5px] rounded-full bg-white/50" />
                                            <div className="h-[5px] w-[5px] rounded-full bg-white/50" />
                                        </div>

                                        <span className="text-[8.5px] uppercase tracking-[2.5px] text-white/85">
                                            Nhân viên chính thức
                                        </span>

                                        <span className="text-[10px] text-white/60">✦</span>
                                    </div>
                                </div>

                                {/* BACK */}
                                <div className="face back" ref={backRef}>
                                    <div className="flex h-9 items-center justify-center gap-2 bg-gradient-to-r from-[#E8607A] to-[#A8305C]">
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="2"
                                        >
                                            <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" />
                                        </svg>

                                        <span className="font-serif text-[12px] font-semibold uppercase tracking-[3px] text-white">
                                            Cinnamon Forest
                                        </span>
                                    </div>

                                    <div className="flex gap-3 px-4 pt-3">
                                        {/* Contact */}
                                        <div className="flex-1">
                                            <p className="mb-3 text-[8.5px] font-medium uppercase tracking-[1px] text-[#F472A8]">
                                                Liên hệ công ty
                                            </p>

                                            <div className="space-y-2">
                                                <InfoRow type="address" text={back.addr} />
                                                <InfoRow type="phone" text={back.phone} />
                                                <InfoRow type="email" text={back.email} />
                                                <InfoRow type="web" text={back.web} />
                                            </div>
                                        </div>

                                        {/* QR */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-[10px] border border-[#FFD6E7] bg-white p-1">
                                                <QRCode
                                                    value="https://cinnamonforest.com"
                                                    size={66}
                                                    style={{ height: "66px", width: "66px" }}
                                                    fgColor="#922054"
                                                    bgColor="#FFFFFF"
                                                />
                                            </div>

                                            <span className="text-[7.5px] uppercase tracking-[0.8px] text-[#F472A8]">
                                                Website
                                            </span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-[#A8305C] to-[#E8607A]" />
                                </div>
                            </div>
                        </div>

                        <p className="flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 text-[10px]">
                                ↻
                            </span>
                            Nhấn vào thẻ để lật
                        </p>

                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                            <button
                                onClick={() => exportPNG("front")}
                                className="flex items-center gap-1.5 rounded-lg border border-[#FFD6E7] bg-[#FFF0F5] px-3 py-2 text-[11px] font-medium text-[#922054] transition hover:bg-[#FFD6E7]"
                            >
                                🖼 PNG mặt trước
                            </button>
                            <button
                                onClick={() => exportPNG("back")}
                                className="flex items-center gap-1.5 rounded-lg border border-[#FFD6E7] bg-[#FFF0F5] px-3 py-2 text-[11px] font-medium text-[#922054] transition hover:bg-[#FFD6E7]"
                            >
                                🖼 PNG mặt sau
                            </button>
                            <button
                                onClick={exportPDF}
                                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8607A] to-[#A8305C] px-3 py-2 text-[11px] font-medium text-white transition hover:opacity-90"
                            >
                                📄 Xuất PDF (2 mặt)
                            </button>
                        </div>

                        {/* BULK EXPORT */}
                        <div className="mt-4 w-full max-w-[420px] rounded-2xl border-2 border-[#FFD6E7] bg-gradient-to-br from-[#FFF0F5] to-white p-4">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#922054]">
                                📦 Tải tất cả thẻ ({employees.length} nhân viên)
                            </p>
                            <div className="grid grid-cols-1 gap-2 mb-3">
                                {([
                                    { v: "pdf", t: "PDF 2 mặt", d: "Mỗi NV 2 trang (trước + sau lật ngang), in 2 mặt." },
                                    { v: "png-zip", t: "ZIP nhiều ảnh PNG", d: "Mỗi NV 2 file PNG (trước/sau) trong 1 file ZIP." },
                                    { v: "png-sheet", t: "1 ảnh PNG tổng hợp", d: "Tất cả thẻ trên 1 ảnh dạng lưới 2 cột." },
                                ] as const).map((o) => (
                                    <button
                                        key={o.v}
                                        onClick={() => setBulkFormat(o.v)}
                                        className={`text-left rounded-lg border-2 p-2.5 transition ${
                                            bulkFormat === o.v
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
                                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8607A] to-[#A8305C] px-3 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                                {bulkBusy ? "Đang xuất..." : "📥 Tải xuống tất cả"}
                            </button>
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#FFD6E7] bg-white">
                        {/* Tabs */}
                        <div className="flex">
                            <button
                                onClick={() => setTab("front")}
                                className={`flex-1 py-3 text-[11px] font-medium tracking-[0.5px] transition ${tab === "front"
                                    ? "bg-gradient-to-r from-[#E8607A] to-[#A8305C] text-white"
                                    : "bg-white text-gray-400"
                                    }`}
                            >
                                Mặt trước
                            </button>

                            <button
                                onClick={() => setTab("back")}
                                className={`flex-1 py-3 text-[11px] font-medium tracking-[0.5px] transition ${tab === "back"
                                    ? "bg-gradient-to-r from-[#E8607A] to-[#A8305C] text-white"
                                    : "bg-white text-gray-400"
                                    }`}
                            >
                                Mặt sau
                            </button>
                        </div>

                        {/* Panels */}
                        <div className="p-5">
                            {tab === "front" && (
                                <div>
                                    <p className="mb-4 text-[10px] uppercase tracking-[1px] text-[#F472A8]">
                                        Thông tin nhân viên
                                    </p>

                                    <Field
                                        label="Họ và tên"
                                        value={front.name}
                                        onChange={(v) =>
                                            setFront({ ...front, name: v })
                                        }
                                    />

                                    <Field
                                        label="Chức vụ"
                                        value={front.role}
                                        onChange={(v) =>
                                            setFront({ ...front, role: v })
                                        }
                                    />

                                    <Field
                                        label="Mã nhân viên"
                                        value={front.id}
                                        onChange={(v) =>
                                            setFront({ ...front, id: v })
                                        }
                                    />
                                </div>
                            )}

                            {tab === "back" && (
                                <div>
                                    <p className="mb-4 text-[10px] uppercase tracking-[1px] text-[#F472A8]">
                                        Thông tin liên hệ
                                    </p>

                                    <Field
                                        label="Địa chỉ"
                                        value={back.addr}
                                        onChange={(v) =>
                                            setBack({ ...back, addr: v })
                                        }
                                    />

                                    <Field
                                        label="Số điện thoại"
                                        value={back.phone}
                                        onChange={(v) =>
                                            setBack({ ...back, phone: v })
                                        }
                                    />

                                    <Field
                                        label="Email"
                                        value={back.email}
                                        onChange={(v) =>
                                            setBack({ ...back, email: v })
                                        }
                                    />

                                    <Field
                                        label="Website"
                                        value={back.web}
                                        onChange={(v) =>
                                            setBack({ ...back, web: v })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* HIDDEN EXPORT */}
            <div className="fixed left-[-99999px] top-0 z-[-1]">
                {employees.map((emp) => {
                    const initials = emp.fullName
                        ?.trim()
                        .split(/\s+/)
                        .map((w: string) => w[0]?.toUpperCase() || "")
                        .slice(-2)
                        .join("");

                    return (
                        <div key={emp._id} className="mb-10">
                            {/* FRONT */}
                            <div
                                id={`export-front-${emp._id}`}
                                className="relative h-[230px] w-[350px] overflow-hidden rounded-[18px] border border-[#FFADD0] bg-[#FFFAF8]"
                            >
                                {/* HEADER */}
                                <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#E8607A] via-[#CC4070] to-[#A8305C] px-4 py-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/20">
                                        ✦
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-serif text-[15px] font-semibold uppercase tracking-[2px] text-white">
                                            Cinnamon Forest
                                        </p>
                                    </div>
                                </div>

                                {/* BODY */}
                                <div className="flex h-[140px] items-center gap-4 px-4 py-3">
                                    <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-gradient-to-br from-[#F9C6D5] to-[#E88AAE] text-[28px] font-semibold text-[#922054]">
                                        {initials}
                                    </div>

                                    <div>
                                        <p className="text-[20px] font-semibold text-[#4A0F2A]">
                                            {emp.fullName}
                                        </p>

                                        <p className="mt-1 text-[10px] uppercase tracking-[1.2px] text-[#E0528A]">
                                            {emp.position}
                                        </p>

                                        <div className="mt-3 flex w-fit items-center overflow-hidden rounded-lg border border-[#FFD6E7] bg-[#FFF0F5]">
                                            <span className="bg-[#FFD6E7] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.8px] text-[#922054]">
                                                ID
                                            </span>

                                            <span className="px-3 py-1 text-[11px] font-medium tracking-[1.2px] text-[#4A0F2A]">
                                                {emp.employeeCode}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="absolute bottom-0 left-0 right-0 flex h-[30px] items-center justify-center bg-gradient-to-r from-[#CC4070] to-[#E8607A] text-[8px] uppercase tracking-[2px] text-white">
                                    Nhân viên chính thức
                                </div>
                            </div>

                            {/* BACK - matching displayed mock */}
                            <div
                                id={`export-back-${emp._id}`}
                                className="relative mt-4 h-[230px] w-[350px] overflow-hidden rounded-[18px] border border-[#FFADD0] bg-[#FFFAF8]"
                            >
                                {/* Header */}
                                <div className="flex h-9 items-center justify-center gap-2 bg-gradient-to-r from-[#E8607A] to-[#A8305C]">
                                    <span className="text-white text-[14px]">✦</span>
                                    <span className="font-serif text-[12px] font-semibold uppercase tracking-[3px] text-white">
                                        Cinnamon Forest
                                    </span>
                                </div>

                                {/* Body: contact + QR */}
                                <div className="flex gap-3 px-4 pt-3">
                                    <div className="flex-1">
                                        <p className="mb-3 text-[8.5px] font-medium uppercase tracking-[1px] text-[#F472A8]">
                                            Liên hệ công ty
                                        </p>
                                        <div className="space-y-2">
                                            <InfoRow type="address" text={back.addr} />
                                            <InfoRow type="phone" text={back.phone} />
                                            <InfoRow type="email" text={back.email} />
                                            <InfoRow type="web" text={back.web} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-[10px] border border-[#FFD6E7] bg-white p-1">
                                            <QRCode
                                                value={`EMPLOYEE:${emp.employeeCode}|${emp.fullName}`}
                                                size={66}
                                                style={{ height: "66px", width: "66px" }}
                                                fgColor="#922054"
                                                bgColor="#FFFFFF"
                                            />
                                        </div>
                                        <span className="text-[7.5px] uppercase tracking-[0.8px] text-[#F472A8]">
                                            ID NV
                                        </span>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-[#A8305C] to-[#E8607A]" />
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>

    );
}

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="mb-4">
            <label className="mb-1 block text-[10px] uppercase tracking-[0.8px] text-gray-400">
                {label}
            </label>

            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-[#FFD6E7] px-3 py-2 text-[12.5px] text-[#4A0F2A] outline-none transition focus:border-[#F472A8]"
            />
        </div>
    );
}

function InfoRow({
    text,
    type,
}: {
    text: string;
    type: "address" | "phone" | "email" | "web";
}) {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-[#FFD6E7] bg-[#FFF0F5]">
                {type === "address" && (
                    <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="#C04060"
                        strokeWidth="1.5"
                        className="h-[9px] w-[9px]"
                    >
                        <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z" />
                        <circle cx="8" cy="6" r="1.5" />
                    </svg>
                )}

                {type === "phone" && (
                    <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="#C04060"
                        strokeWidth="1.5"
                        className="h-[9px] w-[9px]"
                    >
                        <path d="M3 3h2.5l1 3L5 7.5s.9 2.1 3.5 3.5L10 9.5l3 1V13c-6.5 1-11.5-6-10-10z" />
                    </svg>
                )}

                {type === "email" && (
                    <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="#C04060"
                        strokeWidth="1.5"
                        className="h-[9px] w-[9px]"
                    >
                        <rect x="2" y="4" width="12" height="9" rx="1.5" />
                        <path d="M2 5l6 5 6-5" />
                    </svg>
                )}

                {type === "web" && (
                    <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="#C04060"
                        strokeWidth="1.5"
                        className="h-[9px] w-[9px]"
                    >
                        <circle cx="8" cy="8" r="5.5" />
                        <path d="M8 2.5C6.5 5 6 6.5 6 8s.5 3 2 5.5M8 2.5C9.5 5 10 6.5 10 8s-.5 3-2 5.5M2.5 8h11" />
                    </svg>
                )}
            </div>

            <span className="break-words text-[10px] leading-[1.5] text-[#4A0F2A]">
                {text}
            </span>



        </div>
    );
}