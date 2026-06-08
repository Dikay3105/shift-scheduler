import React, {
    useMemo,
    useRef,
    useState,
} from "react";

import { createFileRoute } from "@tanstack/react-router";

import AdminHeader from "@/components/AdminHeader";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
    Search,
    FileText,
    Upload,
    Eye,
    Download,
    File,
    FileSpreadsheet,
    FileArchive,
    Trash2,
    X,
    Loader2,
    Filter,
    BookOpen,
    Scale,
} from "lucide-react";

import { useDocuments } from "@/hooks/use-document";

export const Route = createFileRoute("/rule")({
    component: RulesPage,
});

const CATEGORIES = ["Tất cả", "Văn bản nội bộ", "Nội quy"];

function RulesPage() {
    const {
        documents,
        loading,
        createDocument,
        deleteDocument,
        uploadFile,
    } = useDocuments();

    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("Tất cả");
    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>("");
    const [previewLoading, setPreviewLoading] = useState(false);

    // Upload modal state
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadCategory, setUploadCategory] = useState("Văn bản nội bộ");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredDocs = useMemo(() => {
        return documents.filter((doc) => {
            const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());
            const matchCategory =
                activeCategory === "Tất cả" || doc.category === activeCategory;
            return matchSearch && matchCategory;
        });
    }, [documents, search, activeCategory]);

    const renderCategoryIcon = (category: string) => {
        if (category === "Nội quy") {
            return (
                <div className="rounded-2xl p-4 text-white shadow-md"
                    style={{ background: "linear-gradient(135deg,#8B1A38,#6A1229)" }}>
                    <Scale className="h-6 w-6" />
                </div>
            );
        }
        return (
            <div className="rounded-2xl p-4 text-[#8B1A38] border border-[#E8C0CC]"
                style={{ background: "linear-gradient(135deg,#F8EDF0,#EED5D3)" }}>
                <BookOpen className="h-6 w-6" />
            </div>
        );
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Download thất bại");
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download error:", error);
            alert("Tải file thất bại");
        }
    };

    // Step 1: pick file → open modal
    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Strip extension from original name to prefill title
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setPendingFile(file);
        setUploadTitle(nameWithoutExt);
        setUploadCategory("Văn bản nội bộ");
        setUploadModalOpen(true);

        // Reset sau khi đã lưu file, để có thể chọn lại cùng file lần sau
        e.target.value = "";
    };

    // Step 2: confirm upload
    const handleConfirmUpload = async () => {
        if (!pendingFile) return;
        const title = uploadTitle.trim() || pendingFile.name;

        try {
            setUploading(true);
            setUploadModalOpen(false);
            const attachment = await uploadFile(pendingFile);
            await createDocument({
                title,
                category: uploadCategory,
                attachments: [attachment],
            });
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
            setPendingFile(null);
        }
    };

    const handleCancelUpload = () => {
        setUploadModalOpen(false);
        setPendingFile(null);
        setUploadTitle("");
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await deleteDocument(id);
        } catch (error) {
            console.error("Delete error:", error);
        } finally {
            setDeletingId(null);
        }
    };

    const handlePreview = async (fileUrl: string, fileType: string, title: string) => {
        setPreviewTitle(title);
        setPreviewLoading(true);
        setPreviewUrl("loading");

        const filename = decodeURIComponent(fileUrl.split("/").pop() || "");
        const ext = filename.split(".").pop()?.toLowerCase() || "";

        if (ext === "docx" || ext === "doc") {
            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
            setPreviewUrl(viewerUrl);
            setPreviewLoading(false);
            return;
        }

        if (ext === "pdf") {
            try {
                const res = await fetch(
                    API_BASE + `/documents/preview/${encodeURIComponent(filename)}`
                );
                if (!res.ok) throw new Error("Fetch failed");
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                setPreviewUrl(blobUrl);
            } catch (err) {
                console.error(err);
                alert("Không thể xem file PDF");
                setPreviewUrl(null);
            } finally {
                setPreviewLoading(false);
            }
            return;
        }

        if (ext === "xlsx" || ext === "xls") {
            setPreviewUrl(
                API_BASE + `/documents/preview/${encodeURIComponent(filename)}`
            );
            setPreviewLoading(false);
            return;
        }

        setPreviewUrl(null);
        setPreviewLoading(false);
        window.open(fileUrl, "_blank");
    };

    const closePreview = () => {
        if (previewUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPreviewTitle("");
        setPreviewLoading(false);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">

            <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
                {/* Hero */}
                <div
                    className="relative mb-8 overflow-hidden rounded-3xl border border-border p-6 md:p-10 shadow-xl"
                    style={{
                        background:
                            "linear-gradient(135deg, #8B1A38 0%, #6A1229 60%, #4A0A1C 100%)",
                    }}
                >
                    <div
                        aria-hidden
                        className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30"
                        style={{ background: "radial-gradient(closest-side, #F4C5CF, transparent 70%)" }}
                    />
                    <div
                        aria-hidden
                        className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full opacity-20"
                        style={{ background: "radial-gradient(closest-side, #EED5D3, transparent 70%)" }}
                    />
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/85 backdrop-blur">
                                <Scale className="h-3.5 w-3.5" />
                                Trung tâm tài liệu
                            </div>
                            <h2 className="mb-2 text-2xl md:text-4xl font-bold leading-tight text-white">
                                Quản lý văn bản & nội quy
                            </h2>
                            <p className="text-sm md:text-base text-white/80">
                                Lưu trữ tập trung, xem trực tiếp, tải về tức thì — hỗ trợ PDF, Word, Excel.
                            </p>
                        </div>
                        <div className="flex gap-4 md:gap-6">
                            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur">
                                <div className="text-[10px] uppercase tracking-wider text-white/70">Tổng tài liệu</div>
                                <div className="mt-1 text-2xl font-bold">{documents.length}</div>
                            </div>
                            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur">
                                <div className="text-[10px] uppercase tracking-wider text-white/70">Đang lọc</div>
                                <div className="mt-1 text-2xl font-bold">{filteredDocs.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <Card className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="relative w-full md:max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm tài liệu..."
                                    className="pl-10 rounded-xl"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={handleFileSelected}
                                />
                                <Button
                                    className="rounded-xl bg-[#8B1A38] text-white hover:bg-[#6A1229]"
                                    onClick={() => {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = "";
                                            fileInputRef.current.click();
                                        }
                                    }}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                    )}
                                    {uploading ? "Đang upload..." : "Upload file"}
                                </Button>
                            </div>
                        </div>

                        {/* Category filter */}
                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeCategory === cat
                                        ? "bg-[#8B1A38] text-white shadow-sm"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                            <div className="ml-auto flex flex-wrap gap-2">
                                {["PDF", "Word", "Excel"].map((f) => (
                                    <span
                                        key={f}
                                        className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground"
                                    >
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Document list */}
                <div className="space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Đang tải danh sách tài liệu...</span>
                        </div>
                    )}

                    {!loading && filteredDocs.length === 0 && (
                        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-16 text-center text-muted-foreground">
                            <FileArchive className="mx-auto mb-4 h-12 w-12 opacity-30" />
                            <p className="text-lg font-medium">Chưa có tài liệu nào</p>
                            <p className="mt-1 text-sm">Upload file PDF, Word hoặc Excel để bắt đầu</p>
                        </div>
                    )}

                    {!loading &&
                        filteredDocs.map((doc) => {
                            const attachment = doc.attachments?.[0];
                            const isDeleting = deletingId === doc._id;

                            return (
                                <Card
                                    key={doc._id}
                                    className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-[#E8C0CC]"
                                >
                                    <CardContent className="p-5 md:p-6">
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="flex items-start gap-4 min-w-0">
                                                {renderCategoryIcon(doc.category)}

                                                <div className="min-w-0">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg md:text-xl font-semibold text-foreground truncate">{doc.title}</h3>
                                                        <Badge
                                                            variant="secondary"
                                                            className="border border-[#E8C0CC] bg-[#F8EDF0] text-[#8B1A38]"
                                                        >
                                                            {doc.category}
                                                        </Badge>
                                                    </div>

                                                    {doc.htmlContent && (
                                                        <div
                                                            className="prose prose-sm max-w-none text-muted-foreground"
                                                            dangerouslySetInnerHTML={{ __html: doc.htmlContent }}
                                                        />
                                                    )}

                                                    <p className="mt-3 text-xs text-muted-foreground">
                                                        {new Date(doc.createdAt).toLocaleString("vi-VN")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:gap-3">
                                                {attachment && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            className="rounded-xl border-[#E8C0CC] text-[#8B1A38] hover:bg-[#F8EDF0]"
                                                            onClick={() => {
                                                                const ext = attachment.fileName?.split(".").pop()?.toLowerCase() || "";
                                                                const fileType = attachment.fileType || (
                                                                    ext === "pdf" ? "application/pdf"
                                                                        : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                                            : ext === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                                                : ""
                                                                );
                                                                handlePreview(attachment.fileUrl, fileType, doc.title);
                                                            }}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Xem
                                                        </Button>

                                                        <Button
                                                            className="rounded-xl bg-[#8B1A38] text-white hover:bg-[#6A1229]"
                                                            onClick={() =>
                                                                handleDownload(attachment.fileUrl, attachment.fileName)
                                                            }
                                                        >
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Tải
                                                        </Button>
                                                    </>
                                                )}

                                                <Button
                                                    variant="destructive"
                                                    className="rounded-2xl"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDelete(doc._id)}
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            </main>

            {/* Upload Modal */}
            {uploadModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCancelUpload();
                    }}
                >
                    <div className="w-full max-w-md rounded-3xl bg-card text-card-foreground border border-border shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h3 className="text-lg font-semibold">Thông tin tài liệu</h3>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-xl"
                                onClick={handleCancelUpload}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Body */}
                        <div className="space-y-5 px-6 py-5">
                            {/* File info */}
                            {pendingFile && (
                                <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
                                    <FileText className="h-5 w-5 shrink-0 text-[#8B1A38]" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{pendingFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(pendingFile.size / 1024).toFixed(0)} KB
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">
                                    Tên tài liệu <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="Nhập tên tài liệu..."
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    className="rounded-xl"
                                    autoFocus
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Danh mục</label>
                                <div className="flex gap-2">
                                    {CATEGORIES.filter((c) => c !== "Tất cả").map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setUploadCategory(cat)}
                                            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${uploadCategory === cat
                                                ? "border-[#8B1A38] bg-[#F8EDF0] text-[#8B1A38]"
                                                : "border-border bg-background text-muted-foreground hover:bg-muted"
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 border-t px-6 py-4">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-2xl"
                                onClick={handleCancelUpload}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="flex-1 rounded-2xl bg-[#8B1A38] hover:bg-[#6A1229]"
                                onClick={handleConfirmUpload}
                                disabled={!uploadTitle.trim()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Xác nhận upload
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closePreview();
                    }}
                >
                    <div className="relative flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-card text-card-foreground border border-border shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center justify-between border-b px-8 py-4">
                            <h3 className="truncate text-lg font-semibold">{previewTitle}</h3>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-xl"
                                onClick={closePreview}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {previewLoading ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Loader2 className="h-10 w-10 animate-spin text-[#8B1A38]" />
                                <p className="text-sm">Đang tải tài liệu...</p>
                            </div>
                        ) : (
                            <iframe
                                key={previewUrl}
                                src={previewUrl === "loading" ? undefined : previewUrl}
                                className="h-full w-full border-0"
                                title={previewTitle}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}