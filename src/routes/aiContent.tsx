// src/routes/aiContent.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Sparkles, Copy, RefreshCw, Search, ArrowLeft,
    Layers, FileText, ChevronDown, Check, X, ImagePlus, Trash2,
    Clock, Send,
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

type Product = { id: string; code: string; name: string; unit?: string | null; description?: string | null };
type DraftImage = { file: File; preview: string };
type GeneratedPost = {
    id: string; products: Product[]; content: string; tone: string;
    scheduleAt: string; platform: string; images: DraftImage[]; saved?: boolean;
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

// ─── Image Upload ─────────────────────────────────────────────────────────────

function MultiImageUploadZone({ images, onAdd, onRemove }: {
    images: DraftImage[]; onAdd: (f: File[]) => void; onRemove: (i: number) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/60 shrink-0">
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => onRemove(i)}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                        <X size={9} />
                    </button>
                </div>
            ))}
            <button onClick={() => ref.current?.click()}
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <ImagePlus size={14} />
                <span className="text-[9px] font-medium">Thêm</span>
            </button>
            <input ref={ref} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { onAdd(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        </div>
    );
}

// ─── Draft Card ───────────────────────────────────────────────────────────────

function DraftCard({ post, index, onUpdate, onRemove, onSave }: {
    post: GeneratedPost; index: number;
    onUpdate: (p: Partial<GeneratedPost>) => void;
    onRemove: () => void;
    onSave: (p: GeneratedPost) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(post.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleSave = async () => {
        setSaving(true);
        try { await onSave(post); } finally { setSaving(false); }
    };

    return (
        <div className={`rounded-xl border overflow-hidden transition-all ${post.saved
            ? "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10"
            : "border-border/50 bg-card shadow-sm"}`}>

            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30 bg-muted/10">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">
                        {post.products.map(p => p.name).join(", ")}
                    </p>
                    {post.products.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate">
                            {post.products.map(p => p.code).join(", ")}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {post.saved && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            <Check size={9} /> Đã lưu
                        </span>
                    )}
                    <button onClick={onRemove}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                <textarea
                    value={post.content}
                    onChange={(e) => onUpdate({ content: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />

                {/* Images */}
                <MultiImageUploadZone
                    images={post.images}
                    onAdd={(files) => onUpdate({ images: [...post.images, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))] })}
                    onRemove={(i) => onUpdate({ images: post.images.filter((_, idx) => idx !== i) })}
                />

                {/* Footer row */}
                <div className="flex flex-wrap gap-2 items-center pt-0.5">
                    {/* Platform */}
                    <div className="relative min-w-[120px] flex-1">
                        <select value={post.platform} onChange={(e) => onUpdate({ platform: e.target.value })}
                            className="w-full appearance-none rounded-lg border border-input bg-background py-1.5 pl-3 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="">Nền tảng</option>
                            {PLATFORMS.map(pl => <option key={pl.id} value={pl.id}>{pl.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>

                    {/* Schedule */}
                    <div className="relative min-w-[170px] flex-1">
                        <Clock className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <input type="datetime-local" value={post.scheduleAt}
                            onChange={(e) => onUpdate({ scheduleAt: e.target.value })}
                            className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0 ml-auto">
                        <button onClick={handleCopy}
                            className="flex items-center gap-1 rounded-lg border border-input px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            {copied ? "Đã copy" : "Copy"}
                        </button>
                        <button onClick={handleSave} disabled={saving || post.saved}
                            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-80 transition disabled:opacity-40">
                            {saving ? <RefreshCw size={11} className="animate-spin" /> : post.saved ? <Check size={11} /> : <Send size={11} />}
                            {post.saved ? "Đã lưu" : "Lưu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
                    `${SUPABASE_URL}/rest/v1/products?select=id,code,name,unit,description&order=created_at.desc`,
                    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
                );
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
            } catch { } finally { setLoadingProducts(false); }
        })();
    }, []);

    useEffect(() => {
        if (!editId) return;
        (async () => {
            try {
                const { data: post } = await aiPostApi.getPost(editId);
                setMode("single"); setTone(post.tone); setExtra(post.extraNote ?? "");
                const scheduleAt = post.scheduledAt
                    ? new Date(new Date(post.scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                    : "";
                setDrafts([{ id: editId, products: (post.products ?? []) as any, content: post.content, tone: post.tone, platform: post.platform ?? "", scheduleAt, images: [], saved: false }]);
            } catch { }
        })();
    }, [editId]);

    useEffect(() => {
        if (!editId || loadingProducts) return;
        (async () => {
            try {
                const { data } = await aiPostApi.getPost(editId);
                const codes = new Set(data.products.map((p: any) => p.code));
                setSelected(new Set(products.filter(p => codes.has(p.code)).map(p => p.id)));
            } catch { }
        })();
    }, [editId, loadingProducts, products]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const withDesc = products.filter(p => {
            const d = p.description ?? "";
            return d.trim() !== "" && d !== "<p><br></p>" && d !== "<p></p>";
        });
        if (!q) return withDesc;
        return withDesc.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }, [products, search]);

    const selectedProducts = products.filter(p => selected.has(p.id));
    const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const updateDraft = (id: string, patch: Partial<GeneratedPost>) => setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));

    const generate = async () => {
        if (!selectedProducts.length) return alert("Hãy chọn ít nhất 1 sản phẩm");
        setGenerating(true);
        try {
            if (mode === "single") {
                const { data } = await aiPostApi.generateContent({
                    products: selectedProducts.map(p => ({ code: p.code, name: p.name, unit: p.unit ?? undefined })),
                    platform: "facebook", tone, extraNote: extra, customPrompt: customPrompt || undefined,
                });
                setDrafts([{ id: crypto.randomUUID(), products: selectedProducts, content: data.content, tone, scheduleAt: "", platform: "", images: [], saved: false }]);
            } else {
                const results = await Promise.all(selectedProducts.map(p =>
                    aiPostApi.generateContent({ products: [{ code: p.code, name: p.name, unit: p.unit ?? undefined }], platform: "facebook", tone, extraNote: extra, customPrompt: customPrompt || undefined })
                ));
                setDrafts(results.map(({ data }, i) => ({ id: crypto.randomUUID(), products: [selectedProducts[i]], content: data.content, tone, scheduleAt: "", platform: "", images: [], saved: false })));
            }
        } catch (err: any) { alert(`Lỗi: ${err.message}`); }
        finally { setGenerating(false); }
    };

    const saveDraft = async (post: GeneratedPost) => {
        const payload = {
            content: post.content, platform: post.platform as AiPostPlatform, tone: post.tone as AiPostTone,
            products: post.products.map(p => ({ productId: p.id, code: p.code, name: p.name })),
            extraNote: extra, scheduledAt: post.scheduleAt ? new Date(post.scheduleAt).toISOString() : undefined,
        };
        if (isEditMode && editId && post.id === editId) await updatePost(editId, payload, post.images.map(i => i.file), []);
        else await createPost(payload, post.images.map(i => i.file));
        updateDraft(post.id, { saved: true });
    };

    const saveAll = async () => {
        const unsaved = drafts.filter(d => !d.saved);
        if (!unsaved.length) return;
        setSavingAll(true);
        try { await Promise.all(unsaved.map(saveDraft)); setTimeout(() => navigate({ to: "/aiPosts" }), 600); }
        catch (err: any) { alert(`Lỗi: ${err.message}`); }
        finally { setSavingAll(false); }
    };

    const savedCount = drafts.filter(d => d.saved).length;

    return (
        <div className="min-h-screen bg-muted/20">
            <main className="mx-auto max-w-7xl px-5 py-5">

                {/* Top bar */}
                <div className="mb-4 flex items-center justify-between">
                    <button onClick={() => navigate({ to: "/aiPosts" })}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft size={14} /> Quản lý bài viết
                    </button>
                    {!isEditMode && (
                        <div className="flex rounded-lg border border-input bg-background p-0.5 shadow-sm">
                            {[
                                { v: "single" as const, icon: <FileText size={13} />, label: "1 bài cho tất cả" },
                                { v: "bulk" as const, icon: <Layers size={13} />, label: "Mỗi SP 1 bài" },
                            ].map(({ v, icon, label }) => (
                                <button key={v} onClick={() => { setMode(v); setDrafts([]); }}
                                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === v ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2-col layout */}
                <div className="grid gap-4 lg:grid-cols-[420px_1fr]" style={{ height: "calc(100vh - 160px)" }}>

                    {/* LEFT */}
                    <div className="flex flex-col gap-3 overflow-hidden min-h-0">

                        {/* Product picker - chiếm phần lớn */}
                        <Card className="border-0 shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">
                            <CardContent className="flex flex-col p-4 h-full overflow-hidden gap-3">
                                <div className="flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">Sản phẩm</span>
                                        {selected.size > 0 && (
                                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                                                {selected.size}
                                            </span>
                                        )}
                                    </div>
                                    {selected.size > 0 && (
                                        <button onClick={() => setSelected(new Set())}
                                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                                            Bỏ chọn
                                        </button>
                                    )}
                                </div>

                                {/* Selected chips */}
                                {selected.size > 0 && (
                                    <div className="shrink-0 rounded-lg border border-primary/15 bg-primary/5 p-2">
                                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                            {selectedProducts.map(p => (
                                                <span key={p.id} className="flex items-center gap-1 rounded-md border border-border/50 bg-background px-1.5 py-0.5 text-[11px]">
                                                    {p.code}
                                                    <button onClick={() => toggle(p.id)} className="text-muted-foreground hover:text-destructive leading-none">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Search */}
                                <div className="relative shrink-0">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Tìm sản phẩm..."
                                        className="w-full rounded-lg border border-input bg-muted/30 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition" />
                                </div>

                                {/* Count */}
                                <p className="shrink-0 text-[11px] text-muted-foreground">
                                    {filtered.length} sản phẩm có mô tả
                                </p>

                                {/* List - flex-1 để chiếm hết không gian còn lại */}
                                <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                                    {loadingProducts && (
                                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                                            <RefreshCw size={16} className="animate-spin mr-2" /> Đang tải...
                                        </div>
                                    )}
                                    {!loadingProducts && filtered.length === 0 && (
                                        <p className="py-12 text-center text-sm text-muted-foreground">Không có sản phẩm nào có mô tả</p>
                                    )}
                                    {filtered.map(p => {
                                        const isSel = selected.has(p.id);
                                        return (
                                            <button key={p.id} onClick={() => toggle(p.id)}
                                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${isSel ? "bg-primary/8 border border-primary/30" : "border border-transparent hover:bg-muted/60"}`}>
                                                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isSel ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                                                    {isSel && <Check size={9} className="text-primary-foreground" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{p.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{p.code}{p.unit ? ` · ${p.unit}` : ""}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Settings - shrink-0 để không bị co */}
                        <Card className="border-0 shadow-sm shrink-0">
                            <CardContent className="p-4 space-y-3">
                                {/* Tone */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phong cách</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {TONES.map(t => (
                                            <button key={t.id} onClick={() => setTone(t.id)}
                                                className={`rounded-full border px-2.5 py-1 text-xs transition-all ${tone === t.id ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/50 hover:border-border hover:bg-muted"}`}>
                                                {t.emoji} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Extra + Custom - 2 cột cho gọn */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ghi chú</p>
                                        <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2}
                                            placeholder="VD: Giảm 20% cuối tuần..."
                                            className="w-full rounded-lg border border-input bg-muted/20 p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition" />
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yêu cầu riêng</p>
                                        <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={2}
                                            placeholder="VD: Viết theo phong cách thơ..."
                                            className="w-full rounded-lg border border-input bg-muted/20 p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition" />
                                    </div>
                                </div>

                                {/* Generate button */}
                                <button onClick={generate} disabled={generating}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                                    {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {generating ? "Đang tạo..." : mode === "bulk" ? `Tạo ${selected.size || ""} bài AI` : "Tạo nội dung AI"}
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                    {/* RIGHT: Drafts */}
                    <div className="flex flex-col overflow-hidden min-h-0">
                        {drafts.length === 0 ? (
                            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-border/30 bg-muted/10">
                                <div className="text-center text-muted-foreground px-6">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                                        <Sparkles className="h-6 w-6 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">Chọn sản phẩm và tạo nội dung</p>
                                    <p className="mt-1 text-xs opacity-50">Bài viết AI sẽ xuất hiện ở đây</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 flex items-center justify-between shrink-0">
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">{savedCount}</span>/{drafts.length} đã lưu
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {drafts.length > 1 && (
                                            <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                                                    style={{ width: `${(savedCount / drafts.length) * 100}%` }} />
                                            </div>
                                        )}
                                        {savedCount < drafts.length && (
                                            <button onClick={saveAll} disabled={savingAll}
                                                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-40">
                                                {savingAll ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                                                Lưu tất cả
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-0.5">
                                    {drafts.map((post, i) => (
                                        <DraftCard key={post.id} post={post} index={i}
                                            onUpdate={(patch) => updateDraft(post.id, patch)}
                                            onRemove={() => setDrafts(prev => prev.filter(d => d.id !== post.id))}
                                            onSave={saveDraft} />
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