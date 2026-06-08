import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import {
    Plus, Calendar, Clock, Facebook, Instagram, Twitter,
    Copy, Trash2, Search, Sparkles, FileText, CheckCircle2,
    Circle, MoreHorizontal, ExternalLink, Edit3, RefreshCw,
    ChevronDown, SlidersHorizontal, X, ImagePlus, Check, Images,
    Ban,
} from "lucide-react";
import { useAiPosts } from "@/hooks/useAiPosts";
import { aiPostApi } from "@/services/aiPostApi";
import type { AiPost, AiPostPlatform, AiPostTone } from "@/types/aiPost";

export const Route = createFileRoute("/aiPosts")({
    component: AiPostsPage,
});

const POLL_INTERVAL = 15_000;

const TONE_META: Record<string, { label: string; dot: string }> = {
    friendly: { label: "Thân thiện", dot: "#22c55e" },
    promo: { label: "Khuyến mãi", dot: "#f97316" },
    premium: { label: "Sang trọng", dot: "#a855f7" },
    story: { label: "Kể chuyện", dot: "#3b82f6" },
    professional: { label: "Chuyên nghiệp", dot: "#64748b" },
};

const STATUS_META: Record<string, { label: string; color: string; ring: string }> = {
    draft: { label: "Nháp", color: "#94a3b8", ring: "rgba(148,163,184,.25)" },
    scheduled: { label: "Đã lên lịch", color: "#3b82f6", ring: "rgba(59,130,246,.25)" },
    published: { label: "Đã đăng", color: "#22c55e", ring: "rgba(34,197,94,.25)" },
    publishing: { label: "Đang đăng", color: "#f59e0b", ring: "rgba(245,158,11,.25)" },
    failed: { label: "Thất bại", color: "#ef4444", ring: "rgba(239,68,68,.25)" },
    cancelled: { label: "Đã huỷ", color: "#64748b", ring: "rgba(100,116,139,.25)" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
    facebook: <Facebook size={13} />,
    instagram: <Instagram size={13} />,
    twitter: <Twitter size={13} />,
};
const PLATFORM_LABEL: Record<string, string> = {
    facebook: "Facebook", instagram: "Instagram",
    twitter: "Twitter", tiktok: "TikTok", zalo: "Zalo",
};

const TONES_EDIT = [
    { id: "friendly", label: "Thân thiện", emoji: "🌿" },
    { id: "promo", label: "Khuyến mãi", emoji: "🔥" },
    { id: "premium", label: "Sang trọng", emoji: "✨" },
    { id: "story", label: "Kể chuyện", emoji: "📖" },
    { id: "professional", label: "Chuyên nghiệp", emoji: "💼" },
];

const PLATFORMS_EDIT = [
    { id: "facebook", label: "Facebook", icon: <Facebook size={13} /> },
    { id: "instagram", label: "Instagram", icon: <Instagram size={13} /> },
    { id: "twitter", label: "Twitter", icon: <Twitter size={13} /> },
];

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function isoToLocal(iso: string) {
    const dt = new Date(iso);
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

// ─── Multi Image Zone ─────────────────────────────────────────────────────────

type ImageItem =
    | { type: "existing"; url: string }
    | { type: "new"; file: File; preview: string };

function MultiImageZone({
    items,
    onAdd,
    onRemove,
}: {
    items: ImageItem[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="miz-wrap">
            {items.map((item, i) => (
                <div key={i} className="miz-thumb">
                    <img
                        src={item.type === "existing" ? item.url : item.preview}
                        alt=""
                        className="miz-img"
                    />
                    <button className="miz-remove" onClick={() => onRemove(i)}>
                        <X size={11} />
                    </button>
                    {item.type === "existing" && (
                        <span className="miz-badge">Đã lưu</span>
                    )}
                </div>
            ))}
            <button className="miz-add" onClick={() => ref.current?.click()}>
                <ImagePlus size={18} />
                <span>Thêm ảnh</span>
            </button>
            <input
                ref={ref}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={e => {
                    onAdd(Array.from(e.target.files ?? []));
                    e.target.value = "";
                }}
            />
        </div>
    );
}

// ─── EditPostDrawer ───────────────────────────────────────────────────────────

function CharCount({ text, max = 2000 }: { text: string; max?: number }) {
    const pct = text.length / max;
    const color = pct > .9 ? "#ef4444" : pct > .75 ? "#f59e0b" : "#94a3b8";
    return <span style={{ fontSize: ".68rem", color, fontVariantNumeric: "tabular-nums" }}>{text.length}/{max}</span>;
}

function EditPostDrawer({ postId, onClose, onSaved }: {
    postId: string | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { updatePost } = useAiPosts();

    const [content, setContent] = useState("");
    const [tone, setTone] = useState("friendly");
    const [platform, setPlatform] = useState("");
    const [scheduleAt, setScheduleAt] = useState("");
    const [extraNote, setExtraNote] = useState("");
    const [postMeta, setPostMeta] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<"content" | "schedule" | "image">("content");

    // Image state: mix of existing URLs + new File objects
    const [imageItems, setImageItems] = useState<ImageItem[]>([]);

    useEffect(() => {
        if (postId) {
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            setVisible(false);
        }
    }, [postId]);

    useEffect(() => {
        if (!postId) return;
        setLoading(true);
        setPostMeta(null);
        setContent(""); setTone("friendly"); setPlatform("");
        setScheduleAt(""); setExtraNote(""); setImageItems([]);
        setActiveTab("content");

        aiPostApi.getPost(postId).then(res => {
            const p = res.data;
            setPostMeta(p);
            setContent(p.content ?? "");
            setTone(p.tone ?? "friendly");
            setPlatform(p.platform ?? "");
            setExtraNote(p.extraNote ?? "");
            if (p.scheduledAt) setScheduleAt(isoToLocal(p.scheduledAt));
            // Load existing images
            const urls: string[] = (p as any).imageUrls ?? (p.imageUrl ? [p.imageUrl] : []);
            if (urls.length) {
                setImageItems(urls.map((url: string) => ({ type: "existing" as const, url })));
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, [postId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 280);
    };

    const handleAddImages = (files: File[]) => {
        const newItems: ImageItem[] = files.map(file => ({
            type: "new",
            file,
            preview: URL.createObjectURL(file),
        }));
        setImageItems(prev => [...prev, ...newItems]);
    };

    const handleRemoveImage = (index: number) => {
        setImageItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!postId || !content) return;
        setSaving(true);
        try {
            const keepImageUrls = imageItems
                .filter((i): i is Extract<ImageItem, { type: "existing" }> => i.type === "existing")
                .map(i => i.url);

            const newFiles = imageItems
                .filter((i): i is Extract<ImageItem, { type: "new" }> => i.type === "new")
                .map(i => i.file);

            await updatePost(
                postId,
                {
                    content,
                    platform: platform as AiPostPlatform,
                    tone: tone as AiPostTone,
                    extraNote,
                    scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
                },
                newFiles,
                keepImageUrls,
            );
            onSaved();
            handleClose();
        } catch (err: any) {
            alert(`Lỗi: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const status = postMeta ? STATUS_META[postMeta.status] ?? STATUS_META.draft : null;
    const products = postMeta?.products ?? [];

    if (!postId) return null;

    return (
        <>
            <div className={`epd-backdrop ${visible ? "epd-backdrop--in" : ""}`} onClick={handleClose} />
            <div className={`epd-panel ${visible ? "epd-panel--in" : ""}`} role="dialog" aria-modal="true">

                {/* header */}
                <div className="epd-header">
                    <div className="epd-header-left">
                        <div className="epd-header-icon"><Edit3 size={15} /></div>
                        <div>
                            <p className="epd-header-title">Chỉnh sửa bài viết</p>
                            {status && (
                                <div className="epd-status-row">
                                    <span className="epd-status-dot" style={{ background: status.color }} />
                                    <span style={{ fontSize: ".7rem", fontWeight: 600, color: status.color }}>{status.label}</span>
                                    {postMeta?.platform && (
                                        <span className="epd-platform-tag">
                                            {PLATFORM_ICON[postMeta.platform]}
                                            {PLATFORM_LABEL[postMeta.platform] ?? postMeta.platform}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="epd-close-btn" onClick={handleClose}><X size={16} /></button>
                </div>

                {/* product tags */}
                {products.length > 0 && (
                    <div className="epd-products">
                        {products.map((p: any) => (
                            <span key={p.productId ?? p.code} className="epd-product-tag">{p.code} · {p.name}</span>
                        ))}
                    </div>
                )}

                {/* tabs */}
                <div className="epd-tabs">
                    {(["content", "schedule", "image"] as const).map(tab => (
                        <button
                            key={tab}
                            className={`epd-tab ${activeTab === tab ? "epd-tab--active" : ""}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === "content" && "✏️ Nội dung"}
                            {tab === "schedule" && "🗓 Lịch đăng"}
                            {tab === "image" && (
                                <span style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
                                    🖼 Hình ảnh
                                    {imageItems.length > 0 && (
                                        <span className="epd-img-badge">{imageItems.length}</span>
                                    )}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* body */}
                <div className="epd-body">
                    {loading ? (
                        <div className="epd-loading">
                            <RefreshCw size={22} className="epd-spin" />
                            <p>Đang tải...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === "content" && (
                                <div className="epd-section">
                                    <div className="epd-field-label-row">
                                        <label className="epd-label">Nội dung</label>
                                        <CharCount text={content} />
                                    </div>
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        className="epd-textarea"
                                        rows={17}
                                        placeholder="Nội dung bài viết..."
                                    />
                                </div>
                            )}

                            {activeTab === "schedule" && (
                                <div className="epd-section">
                                    <label className="epd-label">Nền tảng</label>
                                    <div className="epd-platform-grid">
                                        {PLATFORMS_EDIT.map(pl => (
                                            <button
                                                key={pl.id}
                                                onClick={() => setPlatform(pl.id)}
                                                className={`epd-platform-btn ${platform === pl.id ? "epd-platform-btn--active" : ""}`}
                                            >
                                                <span className="epd-platform-icon">{pl.icon}</span>{pl.label}
                                            </button>
                                        ))}
                                    </div>

                                    <label className="epd-label" style={{ marginTop: "1.25rem" }}>Thời gian đăng</label>
                                    <div className="epd-schedule-card">
                                        <Calendar size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                                        <input
                                            type="datetime-local"
                                            value={scheduleAt}
                                            onChange={e => setScheduleAt(e.target.value)}
                                            className="epd-datetime"
                                        />
                                    </div>
                                    {scheduleAt && (
                                        <p className="epd-schedule-hint">
                                            <Clock size={11} /> Sẽ đăng vào{" "}
                                            <strong>{new Date(scheduleAt).toLocaleString("vi-VN", {
                                                day: "2-digit", month: "2-digit", year: "numeric",
                                                hour: "2-digit", minute: "2-digit",
                                            })}</strong>
                                        </p>
                                    )}
                                    {postMeta?.fbPostUrl && (
                                        <a href={postMeta.fbPostUrl} target="_blank" rel="noreferrer" className="epd-external-link">
                                            <ExternalLink size={13} /> Xem bài đã đăng
                                        </a>
                                    )}
                                </div>
                            )}

                            {activeTab === "image" && (
                                <div className="epd-section">
                                    <div className="epd-field-label-row">
                                        <label className="epd-label">Hình ảnh đính kèm</label>
                                        <span style={{ fontSize: ".72rem", color: "#94a3b8" }}>{imageItems.length} ảnh</span>
                                    </div>

                                    {imageItems.length === 0 ? (
                                        <button className="epd-img-empty" onClick={() => {
                                            // trigger add via MultiImageZone — just switch hint
                                        }}>
                                            <Images size={32} style={{ opacity: .3 }} />
                                            <span>Chưa có hình ảnh</span>
                                        </button>
                                    ) : null}

                                    <MultiImageZone
                                        items={imageItems}
                                        onAdd={handleAddImages}
                                        onRemove={handleRemoveImage}
                                    />

                                    <p className="epd-img-tip">
                                        Khuyến nghị tỉ lệ 1:1 hoặc 4:5 cho Facebook/Instagram · PNG, JPG, WEBP · tối đa 5MB/ảnh
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* footer */}
                <div className="epd-footer">
                    <button className="epd-btn-copy" onClick={handleCopy}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? "Đã copy" : "Copy"}
                    </button>
                    <button className="epd-btn-cancel" onClick={handleClose}>Huỷ</button>
                    <button className="epd-btn-save" onClick={handleSave} disabled={saving || loading}>
                        {saving ? <RefreshCw size={13} className="epd-spin" /> : <Check size={13} />}
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post, onDelete, onCopy, onEdit, onCancel }: {
    post: AiPost;
    onDelete: (id: string) => void;
    onCopy: (c: string) => void;
    onEdit: (id: string) => void;
    onCancel: (id: string) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [imgIdx, setImgIdx] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const tone = TONE_META[post.tone] ?? TONE_META.friendly;
    const status = STATUS_META[post.status] ?? STATUS_META.draft;
    const products = post.products ?? [];
    const images: string[] = (post as any).imageUrls ?? [];
    const canEdit = post.status === "draft" || post.status === "scheduled";
    const canCancel = post.status === "scheduled"; // BE chỉ cho cancel khi đang scheduled

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        if (menuOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen]);

    return (
        <div className="post-card">
            <div className="card-accent" style={{ background: status.color }} />

            {/* Image strip */}
            {images.length > 0 && (
                <div className="card-img-strip">
                    <img src={images[imgIdx]} alt="" className="card-img-main" />
                    {images.length > 1 && (
                        <div className="card-img-thumbs">
                            {images.map((url, i) => (
                                <button
                                    key={i}
                                    onClick={() => setImgIdx(i)}
                                    className={`card-thumb ${i === imgIdx ? "card-thumb--active" : ""}`}
                                >
                                    <img src={url} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                    <span className="card-img-count">
                        <Images size={11} /> {images.length}
                    </span>
                </div>
            )}

            <div className="card-body">
                <div className="card-header-row">
                    <span className="status-pill" style={{ color: status.color, boxShadow: `0 0 0 1px ${status.ring}, 0 0 8px ${status.ring}` }}>
                        <span className="status-dot" style={{ background: status.color }} />
                        {status.label}
                    </span>
                    <div className="header-meta">
                        {post.platform && (
                            <span className="meta-chip platform-chip">
                                {PLATFORM_ICON[post.platform]}
                                {PLATFORM_LABEL[post.platform] ?? post.platform}
                            </span>
                        )}
                        <span className="meta-chip">
                            <span className="tone-dot" style={{ background: tone.dot }} />
                            {tone.label}
                        </span>
                    </div>
                    <div className="menu-wrap" ref={menuRef}>
                        <button className="menu-btn" onClick={() => setMenuOpen(v => !v)}>
                            <MoreHorizontal size={15} />
                        </button>
                        {menuOpen && (
                            <div className="dropdown">
                                <button className="drop-item" onClick={() => { onCopy(post.content); setMenuOpen(false); }}>
                                    <Copy size={13} /> Copy nội dung
                                </button>
                                {canEdit && (
                                    <button className="drop-item" onClick={() => { onEdit(post._id); setMenuOpen(false); }}>
                                        <Edit3 size={13} /> Chỉnh sửa
                                    </button>
                                )}
                                {canCancel && (
                                    <button className="drop-item" onClick={() => { onCancel(post._id); setMenuOpen(false); }}>
                                        <Ban size={13} /> Huỷ lịch đăng
                                    </button>
                                )}
                                {post.fbPostUrl && (
                                    <a className="drop-item" href={post.fbPostUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink size={13} /> Xem trên nền tảng
                                    </a>
                                )}
                                <div className="drop-divider" />
                                <button className="drop-item danger" onClick={() => { onDelete(post._id); setMenuOpen(false); }}>
                                    <Trash2 size={13} /> Xoá bài viết
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="post-preview">{post.content.slice(0, 220)}{post.content.length > 220 ? "…" : ""}</p>

                {products.length > 0 && (
                    <div className="product-chips">
                        {products.map(p => (
                            <span key={p.productId ?? p.code} className="product-chip">{p.code} · {p.name}</span>
                        ))}
                    </div>
                )}

                <div className="card-footer">
                    <span className="footer-created">Tạo {fmtDate(post.createdAt)}</span>
                    {post.scheduledAt && (
                        <span className="footer-scheduled"><Calendar size={11} /> {fmtDate(post.scheduledAt)}</span>
                    )}
                </div>

                {canEdit && (
                    <button className="card-edit-btn" onClick={() => onEdit(post._id)}>
                        <Edit3 size={12} /> Chỉnh sửa
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ posts }: { posts: AiPost[] }) {
    const stats = [
        { label: "Tổng bài viết", value: posts.length, icon: <FileText size={16} />, accent: "#6366f1" },
        { label: "Đã lên lịch", value: posts.filter(p => p.status === "scheduled").length, icon: <Calendar size={16} />, accent: "#3b82f6" },
        { label: "Đã đăng", value: posts.filter(p => p.status === "published").length, icon: <CheckCircle2 size={16} />, accent: "#22c55e" },
        { label: "Nháp", value: posts.filter(p => p.status === "draft").length, icon: <Circle size={16} />, accent: "#94a3b8" },
    ];
    return (
        <div className="stats-grid">
            {stats.map(s => (
                <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ color: s.accent, background: `${s.accent}18` }}>{s.icon}</div>
                    <div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                    <div className="stat-bar" style={{ background: `${s.accent}22` }}>
                        <div className="stat-fill" style={{ background: s.accent, width: `${Math.min(100, (s.value / Math.max(posts.length, 1)) * 100)}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function SectionHead({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
    return (
        <div className="section-head">
            <span className="section-icon" style={{ color, background: `${color}18` }}>{icon}</span>
            <span className="section-label">{label}</span>
            <span className="section-count" style={{ color, background: `${color}18` }}>{count}</span>
        </div>
    );
}

function LiveDot({ lastRefresh }: { lastRefresh: Date }) {
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick(v => v + 1), 10_000);
        return () => clearInterval(t);
    }, []);
    const secs = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    const label = secs < 10 ? "Vừa cập nhật" : secs < 60 ? `${secs}s trước` : `${Math.floor(secs / 60)}p trước`;
    return (
        <span className="live-dot-wrap">
            <span className="live-dot" />
            <span className="live-label">{label}</span>
        </span>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AiPostsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPlatform, setFilterPlatform] = useState<string>("all");
    const [sortDesc, setSortDesc] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [editPostId, setEditPostId] = useState<string | null>(null);

    const { posts, loading, deletePost, refresh } = useAiPosts();

    useEffect(() => {
        const poll = setInterval(async () => {
            await refresh();
            setLastRefresh(new Date());
        }, POLL_INTERVAL);
        return () => clearInterval(poll);
    }, [refresh]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setLastRefresh(new Date());
        setTimeout(() => setRefreshing(false), 500);
    };

    const filtered = useMemo(() => {
        let r = posts;
        const q = search.trim().toLowerCase();
        if (q) r = r.filter(p =>
            p.content.toLowerCase().includes(q) ||
            (p.products ?? []).some(pr => pr.name.toLowerCase().includes(q) || pr.code.toLowerCase().includes(q))
        );
        if (filterStatus !== "all") r = r.filter(p => p.status === filterStatus);
        if (filterPlatform !== "all") r = r.filter(p => p.platform === filterPlatform);
        return [...r].sort((a, b) => {
            const da = new Date(a.createdAt).getTime();
            const db = new Date(b.createdAt).getTime();
            return sortDesc ? db - da : da - db;
        });
    }, [posts, search, filterStatus, filterPlatform, sortDesc]);

    const handleDelete = (id: string) => deletePost(id);
    const handleDeleteCompletely = async (id: string) => {
        if (!window.confirm("Bạn có chắc muốn xoá bài viết này trên nền tẳng? Hành động này không thể hoàn tác.")) return;
        await aiPostApi.deletePostCompletely(id);
        await refresh();
    }
    const handleCancel = async (id: string) => {
        if (!window.confirm("Bạn có chắc muốn huỷ bài viết này? Bài viết sẽ không được đăng lên nền tảng và chuyển về trạng thái 'Đã huỷ'. Hành động này không thể hoàn tác.")) return;
        await aiPostApi.cancelPost(id);
        await refresh();
    }
    const handleCopy = async (content: string) => { await navigator.clipboard.writeText(content); };
    const handleEdit = (id: string) => setEditPostId(id);

    const scheduled = filtered.filter(p => p.status === "scheduled");
    const published = filtered.filter(p => p.status === "published");
    const drafts = filtered.filter(p => p.status === "draft");
    const failed = filtered.filter(p => p.status === "failed");

    return (
        <>
            <style>{CSS}</style>
            <div className="page-root">
                <main className="page-main">
                    <div className="top-bar">
                        <div className="top-bar-left">
                            <h1 className="page-title">Quản lý bài viết</h1>
                            {!loading && <LiveDot lastRefresh={lastRefresh} />}
                        </div>
                        <div className="top-bar-right">
                            <button className="btn-refresh" onClick={handleRefresh} title="Làm mới">
                                <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                            </button>
                            <button className="btn-secondary" onClick={() => navigate({ to: "/aiContent", search: { bulkMode: false } })}>
                                <Plus size={14} /> Tạo bài mới
                            </button>
                            <button className="btn-primary" onClick={() => navigate({ to: "/aiContent", search: { bulkMode: true } })}>
                                <Sparkles size={14} /> Tạo nhiều bài
                            </button>
                        </div>
                    </div>

                    <StatsBar posts={posts} />

                    <div className="filter-bar">
                        <div className="search-wrap">
                            <Search size={14} className="search-icon" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Tìm nội dung, sản phẩm..." className="search-input" />
                        </div>
                        <div className="select-wrap">
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                                <option value="all">Tất cả trạng thái</option>
                                <option value="draft">Nháp</option>
                                <option value="scheduled">Đã lên lịch</option>
                                <option value="published">Đã đăng</option>
                                <option value="failed">Thất bại</option>
                            </select>
                            <ChevronDown size={13} className="select-chevron" />
                        </div>
                        <div className="select-wrap">
                            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="filter-select">
                                <option value="all">Tất cả nền tảng</option>
                                <option value="facebook">Facebook</option>
                                <option value="instagram">Instagram</option>
                                <option value="twitter">Twitter</option>
                            </select>
                            <ChevronDown size={13} className="select-chevron" />
                        </div>
                        <button className="sort-btn" onClick={() => setSortDesc(v => !v)}>
                            <SlidersHorizontal size={13} />
                            {sortDesc ? "Mới nhất" : "Cũ nhất"}
                        </button>
                    </div>

                    {loading && (
                        <div className="empty-state">
                            <RefreshCw size={24} className="spin" /><p>Đang tải...</p>
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="empty-state">
                            <FileText size={36} />
                            <p className="empty-title">Chưa có bài viết nào</p>
                            <p className="empty-sub">Thay đổi bộ lọc hoặc tạo bài viết mới</p>
                        </div>
                    )}

                    {scheduled.length > 0 && (
                        <section>
                            <SectionHead icon={<Clock size={14} />} label="Đã lên lịch" count={scheduled.length} color="#3b82f6" />
                            <div className="cards-grid">
                                {scheduled.map(p => <PostCard key={p._id} post={p} onDelete={handleDelete} onCancel={handleCancel} onCopy={handleCopy} onEdit={handleEdit} />)}
                            </div>
                        </section>
                    )}
                    {published.length > 0 && (
                        <section>
                            <SectionHead icon={<CheckCircle2 size={14} />} label="Đã đăng" count={published.length} color="#22c55e" />
                            <div className="cards-grid">
                                {published.map(p => <PostCard key={p._id} post={p} onDelete={handleDeleteCompletely} onCancel={handleCancel} onCopy={handleCopy} onEdit={handleEdit} />)}
                            </div>
                        </section>
                    )}
                    {drafts.length > 0 && (
                        <section>
                            <SectionHead icon={<Circle size={14} />} label="Nháp" count={drafts.length} color="#94a3b8" />
                            <div className="cards-grid">
                                {drafts.map(p => <PostCard key={p._id} post={p} onDelete={handleDelete} onCancel={handleCancel} onCopy={handleCopy} onEdit={handleEdit} />)}
                            </div>
                        </section>
                    )}
                    {failed.length > 0 && (
                        <section>
                            <SectionHead icon={<RefreshCw size={14} />} label="Thất bại" count={failed.length} color="#ef4444" />
                            <div className="cards-grid">
                                {failed.map(p => <PostCard key={p._id} post={p} onDelete={handleDelete} onCancel={handleCancel} onCopy={handleCopy} onEdit={handleEdit} />)}
                            </div>
                        </section>
                    )}
                </main>
            </div>

            <EditPostDrawer
                postId={editPostId}
                onClose={() => setEditPostId(null)}
                onSaved={handleRefresh}
            />
        </>
    );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
:root { --b: #9F8983 }
@media (prefers-color-scheme: dark) { :root { --b: #3a3f4b; } }

.page-root { min-height:100vh; background:hsl(var(--muted)/.3); }
.page-main  { max-width:1280px; margin:0 auto; padding:2rem 1.5rem; display:flex; flex-direction:column; gap:1.75rem; }

.top-bar       { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.75rem; }
.top-bar-left  { display:flex; align-items:center; gap:.75rem; }
.top-bar-right { display:flex; align-items:center; gap:.5rem; }
.page-title    { font-size:1.25rem; font-weight:700; letter-spacing:-.02em; color:hsl(var(--foreground)); }

.live-dot-wrap { display:flex; align-items:center; gap:.35rem; }
.live-dot  { width:7px; height:7px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 2px rgba(34,197,94,.3); animation:pulse-dot 2s infinite; }
.live-label{ font-size:.7rem; color:hsl(var(--muted-foreground)); }
@keyframes pulse-dot { 0%,100%{ box-shadow:0 0 0 2px rgba(34,197,94,.3); } 50%{ box-shadow:0 0 0 5px rgba(34,197,94,.1); } }

.btn-refresh   { display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; border:1.5px solid var(--b); background:hsl(var(--background)); color:hsl(var(--muted-foreground)); cursor:pointer; transition:.15s; }
.btn-refresh:hover { background:hsl(var(--muted)); color:hsl(var(--foreground)); }
.btn-secondary { display:flex; align-items:center; gap:.4rem; height:34px; padding:0 .875rem; border-radius:8px; border:1.5px solid var(--b); background:hsl(var(--background)); font-size:.8rem; font-weight:500; color:hsl(var(--foreground)); cursor:pointer; transition:.15s; }
.btn-secondary:hover { background:hsl(var(--muted)); }
.btn-primary   { display:flex; align-items:center; gap:.4rem; height:34px; padding:0 .875rem; border-radius:8px; background:linear-gradient(135deg,#7c3aed,#6366f1); font-size:.8rem; font-weight:600; color:#fff; cursor:pointer; border:none; box-shadow:0 2px 8px rgba(99,102,241,.35); transition:.15s; }
.btn-primary:hover { opacity:.9; }
.spin { animation:spin 1s linear infinite; }
@keyframes spin { to{ transform:rotate(360deg); } }

.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:.875rem; }
@media(max-width:768px){ .stats-grid{ grid-template-columns:1fr 1fr; } }
.stat-card  { position:relative; background:hsl(var(--background)); border:1.5px solid var(--b); border-radius:14px; padding:1rem 1.1rem; display:flex; align-items:center; gap:.875rem; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,.07); transition:.2s; }
.stat-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.12); transform:translateY(-1px); }
.stat-icon  { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:10px; flex-shrink:0; }
.stat-value { font-size:1.5rem; font-weight:700; letter-spacing:-.03em; line-height:1; }
.stat-label { font-size:.72rem; color:hsl(var(--muted-foreground)); margin-top:.2rem; }
.stat-bar   { position:absolute; bottom:0; left:0; right:0; height:3px; }
.stat-fill  { height:100%; transition:width .6s ease; }

.filter-bar    { display:flex; align-items:center; flex-wrap:wrap; gap:.625rem; }
.search-wrap   { position:relative; flex:1; min-width:200px; }
.search-icon   { position:absolute; left:.75rem; top:50%; transform:translateY(-50%); color:hsl(var(--muted-foreground)); pointer-events:none; }
.search-input  { width:100%; height:36px; border-radius:9px; border:1.5px solid var(--b); background:hsl(var(--background)); padding:0 .75rem 0 2.2rem; font-size:.82rem; outline:none; transition:.15s; color:hsl(var(--foreground)); }
.search-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.select-wrap   { position:relative; }
.filter-select { height:36px; appearance:none; border-radius:9px; border:1.5px solid var(--b); background:hsl(var(--background)); padding:0 2rem 0 .75rem; font-size:.82rem; color:hsl(var(--foreground)); cursor:pointer; outline:none; transition:.15s; }
.filter-select:focus{ border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.select-chevron{ position:absolute; right:.6rem; top:50%; transform:translateY(-50%); color:hsl(var(--muted-foreground)); pointer-events:none; }
.sort-btn { display:flex; align-items:center; gap:.4rem; height:36px; padding:0 .75rem; border-radius:9px; border:1.5px solid var(--b); background:hsl(var(--background)); font-size:.82rem; color:hsl(var(--foreground)); cursor:pointer; transition:.15s; white-space:nowrap; }
.sort-btn:hover{ background:hsl(var(--muted)); }

.section-head  { display:flex; align-items:center; gap:.5rem; margin-bottom:.875rem; padding-bottom:.625rem; border-bottom:2px solid var(--b); }
.section-icon  { width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.section-label { font-size:.9rem; font-weight:600; color:hsl(var(--foreground)); }
.section-count { margin-left:auto; font-size:.72rem; font-weight:600; border-radius:999px; padding:.1rem .55rem; }

.cards-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
@media(max-width:1024px){ .cards-grid{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:640px)  { .cards-grid{ grid-template-columns:1fr; } }

/* post card */
.post-card {
    position:relative; background:hsl(var(--background)); border:1.5px solid var(--b);
    border-radius:16px; overflow:hidden; display:flex; flex-direction:column;
    box-shadow:0 2px 6px rgba(0,0,0,.07); transition:box-shadow .2s, transform .2s;
}
.post-card:hover { box-shadow:0 8px 28px rgba(0,0,0,.13); transform:translateY(-2px); }
.post-card:hover .card-edit-btn { opacity:1; transform:translateY(0); }
.card-accent { height:4px; flex-shrink:0; }
.card-body   { padding:1rem; display:flex; flex-direction:column; gap:.75rem; flex:1; }

/* image strip on card */
.card-img-strip { position:relative; width:100%; background:#000; }
.card-img-main  { width:100%; height:160px; object-fit:cover; display:block; opacity:.92; }
.card-img-thumbs {
    position:absolute; bottom:.5rem; left:.5rem;
    display:flex; gap:.3rem;
}
.card-thumb {
    width:32px; height:32px; border-radius:5px; overflow:hidden; border:2px solid transparent;
    padding:0; cursor:pointer; transition:.15s;
}
.card-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.card-thumb--active { border-color:#fff; box-shadow:0 2px 6px rgba(0,0,0,.4); }
.card-img-count {
    position:absolute; top:.5rem; right:.5rem;
    display:flex; align-items:center; gap:.25rem;
    background:rgba(0,0,0,.6); color:#fff; border-radius:6px;
    padding:.2rem .45rem; font-size:.68rem; font-weight:600;
}

.card-header-row { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.header-meta     { display:flex; align-items:center; gap:.35rem; flex-wrap:wrap; flex:1; }

.status-pill { display:inline-flex; align-items:center; gap:.35rem; border-radius:999px; padding:.2rem .65rem; font-size:.72rem; font-weight:600; background:hsl(var(--background)); border:2px solid currentColor; white-space:nowrap; }
.status-dot  { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.meta-chip     { display:inline-flex; align-items:center; gap:.3rem; border-radius:6px; padding:.2rem .55rem; font-size:.7rem; font-weight:500; background:hsl(var(--muted)); color:hsl(var(--muted-foreground)); border:1.5px solid var(--b); }
.platform-chip { background:rgba(59,130,246,.12); color:#2563eb; border-color:#93c5fd; }
.tone-dot      { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

.post-preview { font-size:.8rem; line-height:1.6; color:hsl(var(--foreground)/.85); white-space:pre-wrap; background:hsl(var(--muted)/.5); border:1.5px solid var(--b); border-radius:10px; padding:.75rem; min-height:80px; flex:1; }
.product-chips { display:flex; flex-wrap:wrap; gap:.35rem; }
.product-chip  { font-size:.68rem; border-radius:6px; border:1.5px solid var(--b); background:hsl(var(--background)); color:hsl(var(--muted-foreground)); padding:.2rem .55rem; }
.card-footer      { display:flex; align-items:center; justify-content:space-between; border-top:1.5px solid var(--b); padding-top:.65rem; margin-top:auto; }
.footer-created   { font-size:.68rem; color:hsl(var(--muted-foreground)); }
.footer-scheduled { display:flex; align-items:center; gap:.3rem; font-size:.68rem; font-weight:600; color:#2563eb; }
.card-edit-btn {
    position:absolute; bottom:.75rem; right:.75rem;
    display:flex; align-items:center; gap:.35rem;
    padding:.3rem .7rem; border-radius:7px; border:1.5px solid var(--b);
    background:hsl(var(--background)); color:hsl(var(--foreground));
    font-size:.72rem; font-weight:600; cursor:pointer;
    opacity:0; transform:translateY(4px);
    transition:opacity .18s, transform .18s, box-shadow .18s;
    box-shadow:0 2px 8px rgba(0,0,0,.1);
}
.card-edit-btn:hover { background:hsl(var(--muted)); box-shadow:0 4px 14px rgba(0,0,0,.15); }

.menu-wrap { position:relative; margin-left:auto; }
.menu-btn  { width:28px; height:28px; border-radius:7px; border:none; background:transparent; color:hsl(var(--muted-foreground)); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.15s; }
.menu-btn:hover{ background:hsl(var(--muted)); color:hsl(var(--foreground)); }
.dropdown  { position:absolute; right:0; top:calc(100% + 4px); z-index:100; min-width:168px; background:white; border:1.5px solid var(--b); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.16); padding:.375rem; animation:dd-in .12s ease; }
@keyframes dd-in { from{ opacity:0; transform:translateY(-4px); } to{ opacity:1; transform:translateY(0); } }
.drop-item { display:flex; align-items:center; gap:.5rem; width:100%; padding:.5rem .625rem; border-radius:8px; font-size:.8rem; color:black; background:transparent; border:none; cursor:pointer; text-decoration:none; transition:.12s; }
.drop-item:hover { background:rgba(24,24,24,.05); }
.drop-item.danger { color:#ef4444; }
.drop-item.danger:hover { background:rgba(239,68,68,.07); }
.drop-divider { height:1.5px; background:var(--b); margin:.25rem 0; }

.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.75rem; padding:4rem 1rem; color:hsl(var(--muted-foreground)); text-align:center; border:2px dashed var(--b); border-radius:16px; background:hsl(var(--background)); }
.empty-title { font-size:.95rem; font-weight:600; color:hsl(var(--foreground)); }
.empty-sub   { font-size:.8rem; }

/* ═══ EDIT DRAWER ═══ */
.epd-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.45); backdrop-filter:blur(3px); opacity:0; pointer-events:none; transition:opacity .28s ease; }
.epd-backdrop--in { opacity:1; pointer-events:auto; }
.epd-panel { position:fixed; top:0; right:0; bottom:0; z-index:201; width:min(520px,100vw); background:white; border-left:1.5px solid var(--b); display:flex; flex-direction:column; box-shadow:-16px 0 56px rgba(0,0,0,.2); transform:translateX(100%); transition:transform .28s cubic-bezier(.32,.72,0,1); }
.epd-panel--in { transform:translateX(0); }

.epd-header { display:flex; align-items:flex-start; justify-content:space-between; padding:1.25rem 1.25rem 1rem; border-bottom:1.5px solid var(--b); flex-shrink:0; }
.epd-header-left { display:flex; align-items:flex-start; gap:.75rem; }
.epd-header-icon { width:36px; height:36px; border-radius:10px; background:rgba(99,102,241,.1); border:1.5px solid rgba(99,102,241,.2); display:flex; align-items:center; justify-content:center; color:#6366f1; flex-shrink:0; }
.epd-header-title { font-size:.95rem; font-weight:700; color:hsl(var(--foreground)); }
.epd-status-row   { display:flex; align-items:center; gap:.4rem; margin-top:.25rem; flex-wrap:wrap; }
.epd-status-dot   { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.epd-platform-tag { display:inline-flex; align-items:center; gap:.3rem; font-size:.7rem; font-weight:500; background:rgba(59,130,246,.1); color:#2563eb; border:1.5px solid rgba(59,130,246,.3); border-radius:5px; padding:.1rem .45rem; }
.epd-close-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid var(--b); background:transparent; color:hsl(var(--muted-foreground)); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.15s; flex-shrink:0; }
.epd-close-btn:hover { background:hsl(var(--muted)); color:hsl(var(--foreground)); }

.epd-products { display:flex; flex-wrap:wrap; gap:.35rem; padding:.625rem 1.25rem; border-bottom:1.5px solid var(--b); background:hsl(var(--muted)/.5); flex-shrink:0; }
.epd-product-tag { font-size:.68rem; border-radius:5px; border:1.5px solid var(--b); background:hsl(var(--background)); color:hsl(var(--muted-foreground)); padding:.15rem .5rem; }

.epd-tabs { display:flex; border-bottom:1.5px solid var(--b); padding:0 1.25rem; flex-shrink:0; }
.epd-tab { flex:1; padding:.625rem .5rem; font-size:.78rem; font-weight:500; color:hsl(var(--muted-foreground)); background:transparent; border:none; border-bottom:2.5px solid transparent; margin-bottom:-1.5px; cursor:pointer; transition:.15s; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:.3rem; }
.epd-tab:hover { color:hsl(var(--foreground)); }
.epd-tab--active { color:#6366f1; border-bottom-color:#6366f1; font-weight:600; }
.epd-img-badge { background:#6366f1; color:#fff; border-radius:999px; font-size:.62rem; font-weight:700; padding:.05rem .4rem; min-width:16px; text-align:center; }

.epd-body { flex:1; overflow-y:auto; padding:1.25rem; min-height:0; }
.epd-section { display:flex; flex-direction:column; gap:.75rem; }
.epd-field-label-row { display:flex; align-items:center; justify-content:space-between; }
.epd-label { font-size:.78rem; font-weight:600; color:hsl(var(--foreground)); }
.epd-textarea { width:100%; border-radius:10px; border:1.5px solid var(--b); background:hsl(var(--background)); color:hsl(var(--foreground)); padding:.75rem; font-size:.82rem; line-height:1.65; resize:vertical; outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s; }
.epd-textarea:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }

.epd-platform-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:.5rem; }
.epd-platform-btn { display:flex; align-items:center; justify-content:center; gap:.4rem; border-radius:10px; border:1.5px solid var(--b); background:hsl(var(--background)); color:hsl(var(--foreground)); padding:.65rem .5rem; font-size:.78rem; font-weight:500; cursor:pointer; transition:.15s; }
.epd-platform-btn:hover { background:hsl(var(--muted)); }
.epd-platform-btn--active { border-color:#6366f1; background:rgba(99,102,241,.08); color:#6366f1; font-weight:600; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.epd-platform-icon { display:flex; }

.epd-schedule-card { display:flex; align-items:center; gap:.75rem; border-radius:10px; border:1.5px solid var(--b); background:hsl(var(--background)); padding:.75rem 1rem; }
.epd-datetime { flex:1; border:none; background:transparent; outline:none; font-size:.82rem; color:hsl(var(--foreground)); font-family:inherit; }
.epd-schedule-hint { display:flex; align-items:center; gap:.3rem; flex-wrap:wrap; font-size:.73rem; color:#4f46e5; background:rgba(99,102,241,.08); border:1.5px solid rgba(99,102,241,.2); border-radius:8px; padding:.4rem .7rem; }
.epd-external-link { display:inline-flex; align-items:center; gap:.4rem; font-size:.78rem; color:#2563eb; text-decoration:none; border:1.5px solid rgba(59,130,246,.3); border-radius:8px; padding:.4rem .75rem; background:rgba(59,130,246,.08); transition:.15s; width:fit-content; }
.epd-external-link:hover { background:rgba(59,130,246,.15); }

/* multi image zone in drawer */
.miz-wrap  { display:flex; flex-wrap:wrap; gap:.5rem; }
.miz-thumb { position:relative; width:100px; height:100px; border-radius:10px; overflow:hidden; border:1.5px solid var(--b); flex-shrink:0; }
.miz-img   { width:100%; height:100%; object-fit:cover; display:block; }
.miz-remove { position:absolute; top:.3rem; right:.3rem; width:22px; height:22px; border-radius:999px; background:rgba(0,0,0,.65); color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.15s; }
.miz-remove:hover { background:rgba(239,68,68,.85); }
.miz-badge { position:absolute; bottom:.3rem; left:.3rem; background:rgba(34,197,94,.85); color:#fff; font-size:.58rem; font-weight:700; border-radius:4px; padding:.1rem .35rem; }
.miz-add { width:100px; height:100px; border-radius:10px; border:2px dashed var(--b); background:hsl(var(--muted)/.4); color:hsl(var(--muted-foreground)); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.35rem; cursor:pointer; transition:.15s; font-size:.72rem; font-weight:500; flex-shrink:0; }
.miz-add:hover { border-color:#6366f1; color:#6366f1; background:rgba(99,102,241,.05); }

.epd-img-empty { width:100%; min-height:80px; border:2px dashed var(--b); border-radius:10px; background:hsl(var(--muted)/.3); color:hsl(var(--muted-foreground)); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.4rem; cursor:default; font-size:.8rem; }
.epd-img-tip { font-size:.72rem; color:hsl(var(--muted-foreground)); line-height:1.5; }

.epd-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.75rem; height:200px; color:hsl(var(--muted-foreground)); font-size:.85rem; }
.epd-spin    { animation:epd-spin 1s linear infinite; }
@keyframes epd-spin { to{ transform:rotate(360deg); } }

.epd-footer { display:flex; align-items:center; gap:.5rem; padding:.875rem 1.25rem; border-top:1.5px solid var(--b); background:hsl(var(--muted)/.4); flex-shrink:0; }
.epd-btn-copy { display:flex; align-items:center; gap:.4rem; height:36px; padding:0 .875rem; border-radius:8px; border:1.5px solid var(--b); background:hsl(var(--background)); color:hsl(var(--muted-foreground)); font-size:.8rem; cursor:pointer; transition:.15s; }
.epd-btn-copy:hover { color:hsl(var(--foreground)); }
.epd-btn-cancel { margin-left:auto; display:flex; align-items:center; height:36px; padding:0 .875rem; border-radius:8px; border:1.5px solid var(--b); background:transparent; color:hsl(var(--muted-foreground)); font-size:.8rem; cursor:pointer; transition:.15s; }
.epd-btn-cancel:hover { background:hsl(var(--background)); color:hsl(var(--foreground)); }
.epd-btn-save { display:flex; align-items:center; gap:.4rem; height:36px; padding:0 1rem; border-radius:8px; background:linear-gradient(135deg,#7c3aed,#6366f1); color:#fff; font-size:.82rem; font-weight:600; border:none; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.35); transition:opacity .15s; }
.epd-btn-save:hover { opacity:.88; }
.epd-btn-save:disabled { opacity:.45; cursor:default; }
`;

export default AiPostsPage;