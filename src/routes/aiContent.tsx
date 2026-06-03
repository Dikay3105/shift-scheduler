import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Calendar, Copy, RefreshCw, Search } from "lucide-react";

export const Route = createFileRoute("/aiContent")({
    component: AiContentPage,
});

type Product = {
    id: string;
    code: string;
    name: string;
    unit?: string | null;
    active?: boolean;
    description?: string | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const TONES = [
    { id: "friendly", label: "Thân thiện" },
    { id: "promo", label: "Khuyến mãi" },
    { id: "premium", label: "Sang trọng" },
    { id: "story", label: "Kể chuyện" },
];

function AiContentPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [tone, setTone] = useState("friendly");
    const [extra, setExtra] = useState("");
    const [content, setContent] = useState("");
    const [generating, setGenerating] = useState(false);
    const [scheduleAt, setScheduleAt] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(
                    `${SUPABASE_URL}/rest/v1/products?select=id,code,name,unit,active,description&order=created_at.desc`,
                    {
                        headers: {
                            apikey: SUPABASE_KEY,
                            Authorization: `Bearer ${SUPABASE_KEY}`,
                        },
                    }
                );
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Load products failed", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q)
        );
    }, [products, search]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectedProducts = products.filter((p) => selected.has(p.id));

    const generate = () => {
        if (selectedProducts.length === 0) {
            alert("Hãy chọn ít nhất 1 sản phẩm");
            return;
        }
        setGenerating(true);
        // MOCK AI generator – thay bằng API thật sau
        setTimeout(() => {
            const emojiMap: Record<string, string> = {
                friendly: "🌿",
                promo: "🔥",
                premium: "✨",
                story: "📖",
            };
            const e = emojiMap[tone] || "🌟";
            const heads: Record<string, string> = {
                friendly: `${e} Cinnamon Forest gửi đến bạn những sản phẩm yêu thích hôm nay!`,
                promo: `${e} ƯU ĐÃI HOT - Số lượng có hạn!`,
                premium: `${e} Tinh hoa thiên nhiên trong từng giọt sản phẩm`,
                story: `${e} Từ núi rừng Việt Nam, mỗi sản phẩm là một câu chuyện...`,
            };
            const lines = selectedProducts
                .map(
                    (p, i) =>
                        `${i + 1}. ${p.name} (Mã: ${p.code})${
                            p.unit ? ` - ĐVT: ${p.unit}` : ""
                        }`
                )
                .join("\n");
            const text = `${heads[tone]}\n\n${lines}\n\n${
                extra ? `${extra}\n\n` : ""
            }👉 Inbox ngay để được tư vấn!\n📍 Cinnamon Forest\n\n#CinnamonForest #SảnPhẩmTựNhiên #${tone}`;
            setContent(text);
            setGenerating(false);
        }, 600);
    };

    const copy = async () => {
        await navigator.clipboard.writeText(content);
        alert("Đã copy nội dung!");
    };

    const schedule = () => {
        if (!content) return alert("Chưa có nội dung");
        if (!scheduleAt) return alert("Chọn thời gian đăng");
        const payload = {
            content,
            scheduledAt: scheduleAt,
            products: selectedProducts.map((p) => ({
                id: p.id,
                code: p.code,
                name: p.name,
            })),
            tone,
        };
        // MOCK: thực tế sẽ gọi API FB Graph hoặc lưu vào DB
        console.log("[Schedule FB post]", payload);
        alert(
            `Đã lên lịch đăng FB lúc ${new Date(
                scheduleAt
            ).toLocaleString("vi-VN")} (xem console.log)`
        );
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <AdminHeader
                title="Tạo Content AI"
                description="Sinh bài đăng Facebook từ sản phẩm"
            />
            <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_1.1fr]">
                {/* LEFT: Product picker */}
                <Card className="border-0 shadow-md">
                    <CardContent className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Chọn sản phẩm ({selected.size})
                            </h3>
                            {selected.size > 0 && (
                                <button
                                    onClick={() => setSelected(new Set())}
                                    className="text-xs text-muted-foreground hover:underline"
                                >
                                    Bỏ chọn
                                </button>
                            )}
                        </div>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm theo tên hoặc mã..."
                                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
                            />
                        </div>
                        <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
                            {loading && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    Đang tải...
                                </p>
                            )}
                            {!loading && filtered.length === 0 && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    Không có sản phẩm
                                </p>
                            )}
                            {filtered.map((p) => {
                                const isSel = selected.has(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => toggle(p.id)}
                                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                                            isSel
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:bg-muted/50"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSel}
                                            readOnly
                                            className="mt-1"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {p.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {p.code}
                                                {p.unit ? ` · ${p.unit}` : ""}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT: Generator */}
                <Card className="border-0 shadow-md">
                    <CardContent className="space-y-4 p-5">
                        <h3 className="text-lg font-semibold">Tuỳ chỉnh bài viết</h3>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Phong cách
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TONES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTone(t.id)}
                                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                            tone === t.id
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border hover:bg-muted"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Ghi chú thêm (tuỳ chọn)
                            </label>
                            <textarea
                                value={extra}
                                onChange={(e) => setExtra(e.target.value)}
                                rows={2}
                                placeholder="VD: Giảm 20% cuối tuần, freeship đơn trên 500k..."
                                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                            />
                        </div>

                        <button
                            onClick={generate}
                            disabled={generating}
                            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
                        >
                            {generating ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            {generating ? "Đang tạo..." : "Tạo nội dung AI"}
                        </button>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-sm font-medium">
                                    Nội dung
                                </label>
                                {content && (
                                    <button
                                        onClick={copy}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <Copy className="h-3.5 w-3.5" /> Copy
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={10}
                                placeholder="Nội dung sẽ hiện ở đây..."
                                className="w-full rounded-md border border-input bg-background p-3 text-sm leading-relaxed"
                            />
                        </div>

                        <div className="rounded-lg border border-dashed p-3">
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                                <Calendar className="h-4 w-4" /> Lên lịch đăng FB
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="datetime-local"
                                    value={scheduleAt}
                                    onChange={(e) =>
                                        setScheduleAt(e.target.value)
                                    }
                                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                <button
                                    onClick={schedule}
                                    className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                                >
                                    Lên lịch
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                * Mock: bấm sẽ console.log payload, chưa post FB thật.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
