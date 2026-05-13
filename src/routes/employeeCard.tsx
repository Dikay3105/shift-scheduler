import AdminHeader from "@/components/adminHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import QRCode from "react-qr-code";

export const Route = createFileRoute("/employeeCard")({
    component: EmployeeCardPage,
});

function EmployeeCardPage() {
    const [flipped, setFlipped] = useState(false);
    const [tab, setTab] = useState<"front" | "back">("front");

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

    const initials = useMemo(() => {
        return front.name
            .trim()
            .split(/\s+/)
            .map((w) => w[0]?.toUpperCase() || "")
            .slice(-2)
            .join("");
    }, [front.name]);

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
                                <div className="face front">
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
                                <div className="face back">
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