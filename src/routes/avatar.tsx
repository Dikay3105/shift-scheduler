import AdminHeader from "@/components/AdminHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/avatar")({
    component: AvatarGeneratorPage,
});

function AvatarGeneratorPage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [img, setImg] = useState<HTMLImageElement | null>(null);

    const W = 800;
    const H = 800;
    const CX = 400;
    const CY = 400;
    const PR = 252;

    const r2 = (d: number) => (d * Math.PI) / 180;

    const pc = (r: number, a: number) => ({
        x: CX + r * Math.cos(r2(a)),
        y: CY + r * Math.sin(r2(a)),
    });

    useEffect(() => {
        gen();
    }, [img, name, role]);

    function leaf(
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        a: number,
        s: number,
        col?: string
    ) {
        c.save();
        c.translate(cx, cy);
        c.rotate(a);

        c.beginPath();
        c.moveTo(0, 0);

        c.bezierCurveTo(s * 0.25, -s * 0.44, s * 0.75, -s * 0.44, s, 0);

        c.bezierCurveTo(s * 0.75, s * 0.27, s * 0.25, s * 0.27, 0, 0);

        c.fillStyle = col || "#5B7B8C";
        c.fill();

        c.strokeStyle = "#3D5F6E";
        c.lineWidth = 0.7;
        c.stroke();

        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(s * 0.8, 0);

        c.strokeStyle = "rgba(255,255,255,.3)";
        c.lineWidth = 0.5;
        c.stroke();

        c.restore();
    }

    function flwr(
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        r = 16
    ) {
        c.save();

        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;

            c.beginPath();

            c.ellipse(
                cx + Math.cos(a) * r * 0.62,
                cy + Math.sin(a) * r * 0.62,
                r * 0.52,
                r * 0.35,
                a,
                0,
                Math.PI * 2
            );

            c.fillStyle = "#F2EEE5";
            c.fill();

            c.strokeStyle = "#C8C0AE";
            c.lineWidth = 0.7;
            c.stroke();
        }

        c.beginPath();
        c.arc(cx, cy, r * 0.28, 0, Math.PI * 2);

        c.fillStyle = "#7A5548";
        c.fill();

        c.restore();
    }

    function brry(
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        r = 6
    ) {
        c.save();

        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);

        c.fillStyle = "#B83030";
        c.fill();

        c.strokeStyle = "#7A1E1E";
        c.lineWidth = 0.8;
        c.stroke();

        c.beginPath();
        c.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);

        c.fillStyle = "rgba(255,180,180,.5)";
        c.fill();

        c.restore();
    }

    function star4(
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        s: number,
        col?: string
    ) {
        c.save();

        c.translate(cx, cy);

        c.fillStyle = col || "#C8909A";

        c.beginPath();

        c.moveTo(0, -s);
        c.lineTo(s * 0.22, -s * 0.22);
        c.lineTo(s, 0);
        c.lineTo(s * 0.22, s * 0.22);
        c.lineTo(0, s);
        c.lineTo(-s * 0.22, s * 0.22);
        c.lineTo(-s, 0);
        c.lineTo(-s * 0.22, -s * 0.22);

        c.closePath();
        c.fill();

        c.restore();
    }

    function shieldPath(
        c: CanvasRenderingContext2D,
        bx: number,
        by: number,
        sw: number,
        sh: number
    ) {
        c.beginPath();

        c.moveTo(bx - sw * 0.5, by - sh * 0.28);

        c.lineTo(bx, by - sh * 0.43);

        c.lineTo(bx + sw * 0.5, by - sh * 0.28);

        c.lineTo(bx + sw * 0.47, by + sh * 0.09);

        c.quadraticCurveTo(
            bx + sw * 0.38,
            by + sh * 0.52,
            bx,
            by + sh * 0.58
        );

        c.quadraticCurveTo(
            bx - sw * 0.38,
            by + sh * 0.52,
            bx - sw * 0.47,
            by + sh * 0.09
        );

        c.closePath();
    }

    function drawPhoto(c: CanvasRenderingContext2D) {
        c.save();

        c.beginPath();
        c.arc(CX, CY, PR, 0, Math.PI * 2);

        if (img) {
            c.clip();

            const asp = img.width / img.height;

            let sw, sh, sx, sy;

            if (asp >= 1) {
                sh = img.height;
                sw = sh;
                sx = (img.width - sw) / 2;
                sy = 0;
            } else {
                sw = img.width;
                sh = sw;
                sx = 0;
                sy = (img.height - sh) / 2;
            }

            c.drawImage(
                img,
                sx,
                sy,
                sw,
                sh,
                CX - PR,
                CY - PR,
                PR * 2,
                PR * 2
            );
        } else {
            c.fillStyle = "#DDD9D0";
            c.fill();

            c.fillStyle = "rgba(100,95,88,.7)";
            c.font = "22px Georgia";

            c.textAlign = "center";
            c.textBaseline = "middle";

            c.fillText("Ảnh nhân viên", CX, CY);
        }

        c.restore();

        c.beginPath();
        c.arc(CX, CY, PR + 5, 0, Math.PI * 2);

        c.strokeStyle = "#FAF8F4";
        c.lineWidth = 7;
        c.stroke();

        c.beginPath();
        c.arc(CX, CY, PR + 9, 0, Math.PI * 2);

        c.strokeStyle = "#2C2C2C";
        c.lineWidth = 2.2;
        c.stroke();

        c.beginPath();
        c.arc(CX, CY, PR + 16, 0, Math.PI * 2);

        c.strokeStyle = "rgba(44,44,44,.4)";
        c.lineWidth = 1;
        c.stroke();
    }

    function drawWreath(c: CanvasRenderingContext2D) {
        const VR = PR + 32;

        c.save();

        c.beginPath();
        c.arc(CX, CY, VR, r2(108), r2(72), false);

        c.strokeStyle = "#2C2C2C";
        c.lineWidth = 1.3;
        c.stroke();

        c.beginPath();
        c.arc(CX, CY, VR - 7, r2(113), r2(67), false);

        c.strokeStyle = "rgba(44,44,44,.28)";
        c.lineWidth = 0.7;
        c.stroke();

        c.restore();

        c.save();

        c.strokeStyle = "#2C2C2C";
        c.lineWidth = 1.05;

        const LE = pc(VR, 108);
        const RE = pc(VR, 72);

        c.beginPath();

        c.moveTo(LE.x, LE.y);

        c.bezierCurveTo(LE.x - 2, LE.y + 22, 360, 708, 352, 718);

        c.stroke();

        c.beginPath();

        c.moveTo(RE.x, RE.y);

        c.bezierCurveTo(RE.x + 2, RE.y + 22, 440, 708, 448, 718);

        c.stroke();

        c.restore();

        leaf(c, 356, 698, 2.7, 17);
        leaf(c, 366, 712, 2.4, 14);

        leaf(c, 444, 698, 0.42, 17);
        leaf(c, 434, 712, 0.72, 14);

        for (let ad = 110; ad <= 428; ad += 12) {
            const a = ad % 360;

            const rad = r2(a);

            const x = CX + (VR + 2) * Math.cos(rad);

            const y = CY + (VR + 2) * Math.sin(rad);

            leaf(
                c,
                x,
                y,
                rad + (Math.floor(ad / 12) % 2 === 0 ? 0.4 : -0.4),
                17
            );
        }

        const FP = [
            [270, 30, 23, 32],
            [242, 21, 17, 24],
            [298, 21, 17, 24],
            [210, 16, 16, 22],
            [330, 16, 16, 22],
            [182, 25, 20, 28],
            [358, 25, 20, 28],
            [155, 13, 15, 20],
            [25, 13, 15, 20],
            [130, 9, 14, 18],
            [50, 9, 14, 18],
            [112, 5, 12, 16],
            [68, 5, 12, 16],
        ];

        FP.forEach(([ad, ro, fr, ls]) => {
            const rad = r2(ad);

            const r = VR + ro;

            const x = CX + r * Math.cos(rad);

            const y = CY + r * Math.sin(rad);

            leaf(c, x, y, rad - 0.58, ls);

            leaf(c, x, y, rad + 0.58, ls);

            flwr(c, x, y, fr);
        });

        [
            [160, 15],
            [202, 13],
            [340, 14],
            [382, 15],
            [120, 8],
            [60, 8],
        ].forEach(([ad, ro]) => {
            const rad = r2(ad);

            brry(
                c,
                CX + (VR + ro) * Math.cos(rad),
                CY + (VR + ro) * Math.sin(rad),
                6
            );
        });
    }

    function drawBadge(c: CanvasRenderingContext2D) {
        const bx = CX;
        const by = 690;
        const sw = 60;
        const sh = 70;

        c.beginPath();
        c.arc(bx, by, 58, 0, Math.PI * 2);

        c.fillStyle = "#FAF8F4";
        c.fill();

        shieldPath(c, bx, by, sw, sh);

        c.fillStyle = "#EDEAE4";
        c.fill();

        shieldPath(c, bx, by, sw, sh);

        c.strokeStyle = "#2C2C2C";
        c.lineWidth = 2;

        c.stroke();

        c.save();

        c.font = "italic 34px Georgia";

        c.textAlign = "center";
        c.textBaseline = "middle";

        c.fillStyle = "#2C2C2C";

        c.fillText("CF", bx, by + 5);

        c.restore();

        star4(c, bx, by + sh * 0.43, 5.5);

        flwr(c, bx - 48, by + 8, 11);
        flwr(c, bx + 48, by + 8, 11);
    }

    function drawText(c: CanvasRenderingContext2D) {
        if (!name && !role) return;

        if (name) {
            c.save();

            c.font = "italic 34px Georgia";

            c.textAlign = "center";
            c.textBaseline = "middle";

            c.fillStyle = "#2C2C2C";

            c.fillText(name, CX, 750);

            c.restore();
        }

        if (role) {
            c.save();

            c.font = "22px Georgia";

            c.textAlign = "center";
            c.textBaseline = "middle";

            c.fillStyle = "#888";

            c.fillText(role, CX, 778);

            c.restore();
        }
    }

    function gen() {
        const cv = canvasRef.current;

        if (!cv) return;

        const c = cv.getContext("2d");

        if (!c) return;

        c.fillStyle = "#FAF8F4";

        c.fillRect(0, 0, W, H);

        drawPhoto(c);
        drawWreath(c);
        drawBadge(c);
        drawText(c);
    }

    function dl() {
        const cv = canvasRef.current;

        if (!cv) return;

        const a = document.createElement("a");

        a.download = `cf-avatar-${name || "avatar"}.png`;

        a.href = cv.toDataURL("image/png");

        a.click();
    }

    function loadImage(file: File) {
        const rd = new FileReader();

        rd.onload = (ev) => {
            const im = new Image();

            im.onload = () => {
                setImg(im);
            };

            im.src = ev.target?.result as string;
        };

        rd.readAsDataURL(file);
    }

    return (
        <div className="min-h-screen overflow-hidden bg-muted/30">
            <AdminHeader
                title="Avatar"
                description="Thiết kế và lưu avatar nhân viên"
                backTo="/"
            />

            {/* CONTENT */}
            <div className="bg-[linear-gradient(135deg,#f8f1e9,#f4e9d8)] pb-5">
                <div className="container mx-auto px-4 pt-4 pb-4">
                    <div className="grid items-stretch gap-6 lg:grid-cols-[380px_1fr]">
                        {/* LEFT PANEL */}
                        <div className="flex flex-col rounded-3xl bg-white p-5 shadow-2xl">
                            <div className="mb-4">
                                <h2 className="text-xl font-bold">
                                    Thông tin nhân viên
                                </h2>

                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Tạo avatar và khung nhân viên
                                </p>
                            </div>

                            {/* Upload */}
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium">
                                    Ảnh đại diện
                                </label>

                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[#c5b8a5] p-3 text-left transition-all duration-300 hover:bg-[#f8f1e9]">
                                    <div className="text-2xl">☁️</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            Kéo thả ảnh vào đây
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            hoặc nhấn để chọn ảnh
                                        </p>
                                    </div>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];

                                            if (file) loadImage(file);
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Tên nhân viên
                                    </label>

                                    <input
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        placeholder="Nguyễn Văn An"
                                        className="w-full rounded-2xl border bg-background px-4 py-3 outline-none transition focus:ring-2"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Chức vụ
                                    </label>

                                    <input
                                        value={role}
                                        onChange={(e) =>
                                            setRole(e.target.value)
                                        }
                                        placeholder="Barista · Staff"
                                        className="w-full rounded-2xl border bg-background px-4 py-3 outline-none transition focus:ring-2"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="mt-auto grid gap-2 pt-4">
                                <button
                                    onClick={gen}
                                    className="rounded-2xl bg-[#5B7B8C] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90"
                                >
                                    ✨ Tạo Avatar
                                </button>

                                <button
                                    onClick={dl}
                                    className="rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700"
                                >
                                    ⬇️ Tải PNG (800×800)
                                </button>
                            </div>
                        </div>

                        {/* RIGHT PANEL */}
                        <div className="flex flex-col rounded-3xl bg-white p-5 shadow-2xl">
                            <div className="mb-3 text-center">
                                <h2 className="text-2xl font-bold">
                                    Xem trước
                                </h2>

                                <div className="mt-2 inline-block rounded-full bg-muted px-3 py-0.5 text-xs">
                                    800 × 800
                                </div>
                            </div>

                            {/* Canvas Container */}
                            <div className="flex flex-1 items-center justify-center rounded-3xl bg-[#f8f4eb] p-4">
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={800}
                                    className="aspect-square w-full max-w-[min(420px,55vh)] rounded-2xl border border-[#e0d9cc] bg-white shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}