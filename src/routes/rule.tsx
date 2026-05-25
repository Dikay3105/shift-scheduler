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
} from "lucide-react";

import { useDocuments } from "@/hooks/use-document";

export const Route = createFileRoute("/rule")({
    component: RulesPage,
});

function RulesPage() {
    const {
        documents,
        loading,
        createDocument,
        deleteDocument,
        uploadFile,
    } = useDocuments();

    const [search, setSearch] = useState("");
    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>("");
    const [previewLoading, setPreviewLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredDocs = useMemo(() => {
        return documents.filter((doc) =>
            doc.title.toLowerCase().includes(search.toLowerCase())
        );
    }, [documents, search]);

    const renderFileIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes("pdf")) return <FileText className="h-6 w-6" />;
        if (
            t.includes("sheet") ||
            t.includes("excel") ||
            t.includes("xlsx") ||
            t.includes("spreadsheet")
        ) return <FileSpreadsheet className="h-6 w-6" />;
        return <File className="h-6 w-6" />;
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

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = "";

        try {
            setUploading(true);
            const attachment = await uploadFile(file);
            await createDocument({
                title: file.name,
                category: "File Upload",
                attachments: [attachment],
            });
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
        }
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
        setPreviewUrl("loading"); // mở modal ngay để show loading

        const filename = decodeURIComponent(fileUrl.split("/").pop() || "");
        const ext = filename.split(".").pop()?.toLowerCase() || "";

        // Word → dùng Google Docs Viewer với URL Supabase public (đẹp hơn mammoth)
        if (ext === "docx" || ext === "doc") {
            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
            setPreviewUrl(viewerUrl);
            setPreviewLoading(false);
            return;
        }

        // PDF → fetch về blob để tránh X-Frame-Options
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

        // Excel → backend convert sang HTML
        if (ext === "xlsx" || ext === "xls") {
            setPreviewUrl(
                API_BASE + `api/documents/preview/${encodeURIComponent(filename)}`
            );
            setPreviewLoading(false);
            return;
        }

        // Fallback
        setPreviewUrl(null);
        setPreviewLoading(false);
        window.open(fileUrl, "_blank");
    };

    const closePreview = () => {
        // Revoke blob URL nếu là PDF
        if (previewUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPreviewTitle("");
        setPreviewLoading(false);
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <AdminHeader
                title="Nội quy & Văn bản nội bộ"
                description="Quản lý tài liệu, quy định và văn bản công ty"
                backTo="/"
            />

            <main className="mx-auto max-w-7xl px-6 py-10">
                {/* Hero */}
                <div className="mb-10 rounded-3xl bg-gradient-to-r from-emerald-600 to-green-500 p-8 text-white shadow-2xl">
                    <h2 className="mb-3 text-4xl font-bold">
                        Quản lý văn bản nội bộ
                    </h2>
                    <p className="max-w-3xl text-emerald-100">
                        Upload tài liệu Word / PDF / Excel và xem trực tiếp trên hệ thống.
                    </p>
                </div>

                {/* Toolbar */}
                <Card className="mb-6 rounded-3xl border-0 shadow-md">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="relative w-full md:max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm tài liệu..."
                                    className="pl-10"
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
                                    onChange={handleUploadFile}
                                />
                                <Button
                                    variant="outline"
                                    className="rounded-2xl"
                                    onClick={() => fileInputRef.current?.click()}
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

                        {/* Supported formats */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {["PDF (.pdf)", "Word (.docx)", "Excel (.xlsx)"].map((f) => (
                                <span
                                    key={f}
                                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                                >
                                    {f}
                                </span>
                            ))}
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
                        <div className="rounded-3xl border-2 border-dashed p-16 text-center text-muted-foreground">
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
                                    className="rounded-3xl border-0 shadow-md transition-all hover:shadow-xl"
                                >
                                    <CardContent className="p-6">
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="rounded-2xl bg-muted p-4 text-muted-foreground">
                                                    {renderFileIcon(attachment?.fileType || "doc")}
                                                </div>

                                                <div>
                                                    <div className="mb-2 flex flex-wrap items-center gap-3">
                                                        <h3 className="text-xl font-semibold">{doc.title}</h3>
                                                        <Badge variant="secondary">{doc.category}</Badge>
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

                                            <div className="flex flex-wrap gap-3">
                                                {attachment && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            className="rounded-2xl"
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
                                                            className="rounded-2xl"
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

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closePreview();
                    }}
                >
                    <div className="relative flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
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

                        {/* Loading overlay */}
                        {previewLoading ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
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