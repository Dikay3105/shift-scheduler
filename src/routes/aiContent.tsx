import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
    Sparkles, Calendar, Copy, RefreshCw, Search, ArrowLeft,
    Layers, FileText, ChevronDown, Check, X, ImagePlus, Trash2,
    Clock, Send, ChevronRight,
} from "lucide-react";
import { aiPostApi } from "@/services/aiPostApi";
import { useAiPosts } from "@/hooks/useAiPosts";
import type { AiPostPlatform, AiPostTone } from "@/types/aiPost";

export const Route = createFileRoute("/aiContent")({
    component: AiContentPage,
    validateSearch: (search: Record<string, unknown>) => ({
        bulkMode: Boolean(search?.bulkMode),
        editId: (search?.editId as string) ?? null,
    }),
});

type Product = {
    id: string;
    code: string;
    name: string;
    unit?: string | null;
    active?: boolean;
};

type DraftImage = { file: File; preview: string };

type GeneratedPost = {
    id: string;
    products: Product[];
    content: string;
    tone: string;
    scheduleAt: string;
    platform: string;
    images: DraftImage[];
    saved?: boolean;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const TONES = [
    { id: "friendly", label: "Thân thiện", emoji: "🌿" },
    { id: "promo", label: "Khuyến mãi", emoji: "🔥" },
    { id: "premium", label: "Sang trọng", emoji: "✨" },
    { id: "story", label: "Kể chuyện", emoji: "📖" },
    { id: "professional", label: "Chuyên nghiệp", emoji: "💼" },
];

const PLATFORMS = [
    { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" },
    { id: "twitter", label: "Twitter" },
];

// ─── Multi Image Upload ──────────────────────────────────────────────────────

function MultiImageUploadZone({
    images,
    onAdd,
    onRemove,
    compact = false,
}: {
    images: DraftImage[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
    compact?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const thumbSize = compact ? "h-20 w-20" : "h-24 w-24";
    const btnSize = compact ? "h-20 w-20" : "h-24 w-24";

    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                    <div key={i} className={`relative ${thumbSize} rounded-lg overflow-hidden border border-border/60 shrink-0`}>
                        <img src={img.preview} alt="" className="h-full w-full object-cover" />
                        <button
                            onClick={() => onRemove(i)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                            <X size={11} />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => ref.current?.click()}
                    className={`flex ${btnSize} shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border/50 bg-muted/30 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary`}
                >
                    <ImagePlus size={compact ? 16 : 18} />
                    <span className="text-[10px] font-medium">Thêm ảnh</span>
                </button>
            </div>
            {!compact && (
                <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP · tối đa 5MB/ảnh</p>
            )}
            <input
                ref={ref}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    onAdd(Array.from(e.target.files ?? []));
                    e.target.value = "";
                }}
            />
        </div>
    );
}

// ─── Draft Card ──────────────────────────────────────────────────────────────

function DraftCard({
    post,
    index,
    onUpdate,
    onRemove,
    onSave,
}: {
    post: GeneratedPost;
    index: number;
    onUpdate: (patch: Partial<GeneratedPost>) => void;
    onRemove: () => void;
    onSave: (post: GeneratedPost) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const title = post.products.map(p => p.name).join(", ") || "Bài viết";
    const subtitle = post.products.map(p => p.code).join(", ");

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(post);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`rounded-xl border transition-all ${post.saved
            ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10"
            : "border-border/60 bg-card"
            } shadow-sm overflow-hidden`}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                    {post.saved && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <Check size={10} /> Đã lưu
                        </span>
                    )}
                    <button
                        onClick={onRemove}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* Content textarea */}
                <textarea
                    value={post.content}
                    onChange={(e) => onUpdate({ content: e.target.value })}
                    rows={7}
                    className="w-full rounded-lg border border-input bg-background p-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />

                {/* Images */}
                <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Hình ảnh</p>
                    <MultiImageUploadZone
                        images={post.images}
                        onAdd={(files) => onUpdate({ images: [...post.images, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))] })}
                        onRemove={(i) => onUpdate({ images: post.images.filter((_, idx) => idx !== i) })}
                        compact
                    />
                </div>

                {/* Platform + schedule + actions */}
                <div className="flex flex-wrap gap-2 items-end">
                    {/* Platform */}
                    <div className="relative min-w-[130px] flex-1">
                        <select
                            value={post.platform}
                            onChange={(e) => onUpdate({ platform: e.target.value })}
                            className="w-full appearance-none rounded-lg border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            <option value="">-- Nền tảng --</option>
                            {PLATFORMS.map(pl => (
                                <option key={pl.id} value={pl.id}>{pl.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Schedule */}
                    <div className="relative min-w-[180px] flex-1">
                        <Clock className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="datetime-local"
                            value={post.scheduleAt}
                            onChange={(e) => onUpdate({ scheduleAt: e.target.value })}
                            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={async () => { await navigator.clipboard.writeText(post.content); }}
                            className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs hover:bg-muted transition-colors"
                        >
                            <Copy size={12} />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || post.saved}
                            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90 transition disabled:opacity-40"
                        >
                            {saving
                                ? <RefreshCw size={12} className="animate-spin" />
                                : post.saved ? <Check size={12} /> : <Send size={12} />
                            }
                            {post.saved ? "Đã lưu" : "Lưu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function AiContentPage() {
    const navigate = useNavigate();
    const { bulkMode: initBulkMode, editId } = Route.useSearch();
    const { createPost, updatePost } = useAiPosts();

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [tone, setTone] = useState("friendly");
    const [extra, setExtra] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [savingAll, setSavingAll] = useState(false);
    const [mode, setMode] = useState<"single" | "bulk">(initBulkMode ? "bulk" : "single");

    const [drafts, setDrafts] = useState<GeneratedPost[]>([]);

    const isEditMode = Boolean(editId);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(
                    `${SUPABASE_URL}/rest/v1/products?select=id,code,name,unit,active&order=created_at.desc`,
                    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
                );
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Load products failed", e);
            } finally {
                setLoadingProducts(false);
            }
        })();
    }, []);

    // Load edit post
    useEffect(() => {
        if (!editId) return;
        (async () => {
            try {
                const res = await aiPostApi.getPost(editId);
                const post = res.data;
                setMode("single");
                setTone(post.tone);
                setExtra(post.extraNote ?? "");

                let scheduleAt = "";
                if (post.scheduledAt) {
                    const dt = new Date(post.scheduledAt);
                    scheduleAt = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16);
                }

                setDrafts([{
                    id: editId,
                    products: post.products ?? [],
                    content: post.content,
                    tone: post.tone,
                    platform: post.platform ?? "",
                    scheduleAt,
                    images: [],
                    saved: false,
                }]);
            } catch (e) {
                console.error("Load post for edit failed", e);
            }
        })();
    }, [editId]);

    // Restore selected products khi edit
    useEffect(() => {
        if (!editId || loadingProducts) return;
        (async () => {
            try {
                const res = await aiPostApi.getPost(editId);
                const editCodes = new Set(res.data.products.map((p: any) => p.code));
                const matchedIds = products.filter(p => editCodes.has(p.code)).map(p => p.id);
                setSelected(new Set(matchedIds));
            } catch { /* ignore */ }
        })();
    }, [editId, loadingProducts, products]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        );
    }, [products, search]);

    const selectedProducts = products.filter(p => selected.has(p.id));

    const toggle = (id: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const updateDraft = (id: string, patch: Partial<GeneratedPost>) =>
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));

    const generate = async () => {
        if (selectedProducts.length === 0) return alert("Hãy chọn ít nhất 1 sản phẩm");
        setGenerating(true);
        try {
            if (mode === "single") {
                // 1 bài cho tất cả sản phẩm
                const res = await aiPostApi.generateContent({
                    products: selectedProducts.map(p => ({ code: p.code, name: p.name, unit: p.unit ?? undefined })),
                    platform: "facebook",
                    tone,
                    extraNote: extra,
                    customPrompt: customPrompt || undefined,
                });
                setDrafts([{
                    id: crypto.randomUUID(),
                    products: selectedProducts,
                    content: res.data.content,
                    tone,
                    scheduleAt: "",
                    platform: "",
                    images: [],
                    saved: false,
                }]);
            } else {
                // Mỗi sản phẩm 1 bài
                const results = await Promise.all(
                    selectedProducts.map(p =>
                        aiPostApi.generateContent({
                            products: [{ code: p.code, name: p.name, unit: p.unit ?? undefined }],
                            platform: "facebook",
                            tone,
                            extraNote: extra,
                            customPrompt: customPrompt || undefined,
                        })
                    )
                );
                setDrafts(results.map((res, i) => ({
                    id: crypto.randomUUID(),
                    products: [selectedProducts[i]],
                    content: res.data.content,
                    tone,
                    scheduleAt: "",
                    platform: "",
                    images: [],
                    saved: false,
                })));
            }
        } catch (err: any) {
            alert(`Lỗi tạo nội dung: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const saveDraft = async (post: GeneratedPost) => {
        const payload = {
            content: post.content,
            platform: post.platform as AiPostPlatform,
            tone: post.tone as AiPostTone,
            products: post.products.map(p => ({ productId: p.id, code: p.code, name: p.name })),
            extraNote: extra,
            scheduledAt: post.scheduleAt ? new Date(post.scheduleAt).toISOString() : undefined,
        };
        const files = post.images.map(i => i.file);

        if (isEditMode && editId && post.id === editId) {
            await updatePost(editId, payload, files, []);
        } else {
            await createPost(payload, files);
        }
        updateDraft(post.id, { saved: true });
    };

    const saveAll = async () => {
        const unsaved = drafts.filter(d => !d.saved);
        if (!unsaved.length) return;
        setSavingAll(true);
        try {
            await Promise.all(unsaved.map(d => saveDraft(d)));
            setTimeout(() => navigate({ to: "/aiPosts" }), 600);
        } catch (err: any) {
            alert(`Lỗi: ${err.message}`);
        } finally {
            setSavingAll(false);
        }
    };

    const savedCount = drafts.filter(d => d.saved).length;

    return (
        <div className="min-h-screen bg-muted/30">

            <main className="mx-auto max-w-7xl px-6 py-6">

                {/* Top bar */}
                <div className="mb-5 flex items-center justify-between">
                    <button
                        onClick={() => navigate({ to: "/aiPosts" })}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={15} /> Quản lý bài viết
                    </button>
                    {!isEditMode && (
                        <div className="flex rounded-lg border border-input bg-background p-0.5">
                            <button
                                onClick={() => { setMode("single"); setDrafts([]); }}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "single" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <FileText size={14} /> 1 bài cho tất cả
                            </button>
                            <button
                                onClick={() => { setMode("bulk"); setDrafts([]); }}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "bulk" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Layers size={14} /> Mỗi SP 1 bài
                            </button>
                        </div>
                    )}
                </div>

                {/* 2-col layout */}
                <div className="grid gap-5 lg:grid-cols-[380px_1fr]" style={{ height: "calc(100vh - 180px)" }}>

                    {/* LEFT: Product picker + settings */}
                    <div className="flex flex-col gap-4 overflow-y-auto min-h-0 pr-0.5">

                        {/* Product picker */}
                        <Card className="border-0 shadow-md flex flex-col overflow-hidden shrink-0" style={{ maxHeight: "55%" }}>
                            <CardContent className="flex flex-col p-5 h-full overflow-hidden">
                                <div className="mb-3 flex items-center justify-between shrink-0">
                                    <h3 className="text-base font-semibold">
                                        Chọn sản phẩm
                                        <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{selected.size}</span>
                                    </h3>
                                    {selected.size > 0 && (
                                        <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:underline">
                                            Bỏ chọn
                                        </button>
                                    )}
                                </div>

                                {/* Selected chips */}
                                {selected.size > 0 && (
                                    <div className="mb-3 shrink-0 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                            {selectedProducts.map(p => (
                                                <span key={p.id} className="flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs">
                                                    {p.code}
                                                    <button onClick={() => toggle(p.id)} className="text-muted-foreground hover:text-destructive">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="relative mb-3 shrink-0">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Tìm theo tên hoặc mã..."
                                        className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                                    {loadingProducts && <p className="py-10 text-center text-sm text-muted-foreground">Đang tải...</p>}
                                    {!loadingProducts && filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy</p>}
                                    {filtered.map(p => {
                                        const isSel = selected.has(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => toggle(p.id)}
                                                className={`flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-all ${isSel ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/50"}`}
                                            >
                                                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isSel ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                                                    {isSel && <Check size={10} className="text-primary-foreground" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">{p.code}{p.unit ? ` · ${p.unit}` : ""}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Settings */}
                        <Card className="border-0 shadow-md shrink-0">
                            <CardContent className="space-y-4 p-5">
                                <h3 className="text-base font-semibold">Tuỳ chỉnh</h3>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">Phong cách</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {TONES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTone(t.id)}
                                                className={`rounded-full border px-2.5 py-1 text-xs transition ${tone === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                                            >
                                                {t.emoji} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">Ghi chú thêm</label>
                                    <textarea
                                        value={extra}
                                        onChange={(e) => setExtra(e.target.value)}
                                        rows={2}
                                        placeholder="VD: Giảm 20% cuối tuần..."
                                        className="w-full rounded-lg border border-input bg-background p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">Yêu cầu riêng</label>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        rows={2}
                                        placeholder="VD: Viết theo phong cách thơ..."
                                        className="w-full rounded-lg border border-input bg-background p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                                <button
                                    onClick={generate}
                                    disabled={generating}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
                                >
                                    {generating
                                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                                        : <Sparkles className="h-4 w-4" />
                                    }
                                    {generating
                                        ? "Đang tạo..."
                                        : mode === "bulk"
                                            ? `Tạo ${selected.size || ""} bài AI`
                                            : "Tạo nội dung AI"
                                    }
                                </button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: Drafts */}
                    <div className="flex flex-col overflow-hidden min-h-0">
                        {drafts.length === 0 ? (
                            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-border/40">
                                <div className="text-center text-muted-foreground">
                                    <Sparkles className="mx-auto mb-3 h-10 w-10 opacity-20" />
                                    <p className="text-sm font-medium">Chọn sản phẩm và nhấn tạo nội dung</p>
                                    <p className="mt-1 text-xs opacity-60">Bài viết sẽ hiện ở đây</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Draft toolbar */}
                                <div className="mb-3 flex items-center justify-between shrink-0">
                                    <p className="text-sm text-muted-foreground">
                                        {savedCount}/{drafts.length} đã lưu
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {/* Progress */}
                                        {drafts.length > 1 && (
                                            <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                                                    style={{ width: `${(savedCount / drafts.length) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                        {savedCount < drafts.length && (
                                            <button
                                                onClick={saveAll}
                                                disabled={savingAll}
                                                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-1.5 text-sm font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-40"
                                            >
                                                {savingAll ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                                                Lưu tất cả
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Scrollable draft list */}
                                <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 min-h-0">
                                    {drafts.map((post, i) => (
                                        <DraftCard
                                            key={post.id}
                                            post={post}
                                            index={i}
                                            onUpdate={(patch) => updateDraft(post.id, patch)}
                                            onRemove={() => setDrafts(prev => prev.filter(d => d.id !== post.id))}
                                            onSave={saveDraft}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AiContentPage;