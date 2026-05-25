import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { createFileRoute } from "@tanstack/react-router";

import AdminHeader from "@/components/AdminHeader";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
    Search,
    FileText,
    Upload,
    Eye,
    Download,
    Plus,
    File,
    FileSpreadsheet,
    FileArchive,
    Trash2,
} from "lucide-react";

import { useDocuments } from "@/hooks/use-document";
import WordEditor from "@/components/wordeditor";

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

    const [title, setTitle] = useState("");

    const [category, setCategory] =
        useState("");

    const [editorContent, setEditorContent] =
        useState("");

    const [uploading, setUploading] =
        useState(false);

    const fileInputRef =
        useRef<HTMLInputElement>(null);

    const filteredDocs = useMemo(() => {
        return documents.filter((doc) =>
            doc.title
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [documents, search]);

    const renderFileIcon = (type: string) => {
        if (type.includes("pdf")) {
            return <FileText className="h-6 w-6" />;
        }

        if (
            type.includes("sheet") ||
            type.includes("excel")
        ) {
            return (
                <FileSpreadsheet className="h-6 w-6" />
            );
        }

        return <File className="h-6 w-6" />;
    };

    // Bỏ comment handleDownload, dùng đúng
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

    // Sửa handleUploadFile: upload file rồi tạo document kèm attachment
    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input để có thể upload cùng file lần sau
        if (fileInputRef.current) fileInputRef.current.value = "";

        try {
            setUploading(true);

            // Bước 1: Upload file lên storage, BE trả về { fileName, fileUrl, fileType }
            const attachment = await uploadFile(file);

            // Bước 2: Tạo document với attachment đính kèm
            await createDocument({
                title: file.name,
                category: "File Upload",
                attachments: [attachment],
            });

            alert("Upload thành công");
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload thất bại");
        } finally {
            setUploading(false);
        }
    };

    // Sửa handleCreateDocument: validate rõ hơn
    const handleCreateDocument = async () => {
        if (!title.trim()) {
            alert("Vui lòng nhập tiêu đề");
            return;
        }

        try {
            await createDocument({
                title: title.trim(),
                category: category.trim() || "Chung",
                htmlContent: editorContent,
            });

            // Reset form sau khi tạo thành công
            setTitle("");
            setCategory("");
            setEditorContent("");

            alert("Tạo văn bản thành công");
        } catch (error) {
            console.error("Create error:", error);
            alert("Tạo văn bản thất bại");
        }
    };

    const handlePreview = (fileUrl: string, fileType: string) => {
        if (fileType.includes("pdf")) {
            // PDF: browser tự render
            window.open(fileUrl, "_blank");
            return;
        }

        if (fileType.includes("sheet") || fileType.includes("excel")
            || fileType.includes("docx") || fileType.includes("word")) {
            // DOCX/XLSX: dùng Google Docs Viewer
            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
            window.open(googleViewerUrl, "_blank");
            return;
        }

        // Fallback
        window.open(fileUrl, "_blank");
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
                        Soạn thảo nội quy, upload
                        tài liệu Word/PDF và cho
                        phép nhân viên xem trực
                        tiếp trên hệ thống.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                    {/* LEFT */}
                    <div className="space-y-6 xl:col-span-2">
                        {/* Toolbar */}
                        <Card className="rounded-3xl border-0 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="relative w-full md:max-w-md">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                        <Input
                                            placeholder="Tìm kiếm tài liệu..."
                                            className="pl-10"
                                            value={
                                                search
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setSearch(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <input
                                            type="file"
                                            hidden
                                            ref={
                                                fileInputRef
                                            }
                                            onChange={
                                                handleUploadFile
                                            }
                                        />

                                        <Button
                                            variant="outline"
                                            className="rounded-2xl"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <Upload className="mr-2 h-4 w-4" />

                                            {uploading
                                                ? "Đang upload..."
                                                : "Upload file"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Documents */}
                        <div className="space-y-5">
                            {loading && (
                                <p>
                                    Đang tải...
                                </p>
                            )}

                            {!loading &&
                                filteredDocs.map(
                                    (doc) => {
                                        const attachment =
                                            doc.attachments?.[0];

                                        return (
                                            <Card
                                                key={
                                                    doc._id
                                                }
                                                className="rounded-3xl border-0 shadow-md transition-all hover:shadow-xl"
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className="rounded-2xl bg-muted p-4">
                                                                {renderFileIcon(
                                                                    attachment?.fileType ||
                                                                    "doc"
                                                                )}
                                                            </div>

                                                            <div>
                                                                <div className="mb-2 flex flex-wrap items-center gap-3">
                                                                    <h3 className="text-xl font-semibold">
                                                                        {
                                                                            doc.title
                                                                        }
                                                                    </h3>

                                                                    <Badge variant="secondary">
                                                                        {
                                                                            doc.category
                                                                        }
                                                                    </Badge>
                                                                </div>

                                                                <div
                                                                    className="prose prose-sm max-w-none text-muted-foreground"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: doc.htmlContent ||
                                                                            "",
                                                                    }}
                                                                />

                                                                <p className="mt-3 text-xs text-muted-foreground">
                                                                    {new Date(
                                                                        doc.createdAt
                                                                    ).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-3">
                                                            {attachment && (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        className="rounded-2xl"
                                                                        onClick={() => handlePreview(attachment.fileUrl, attachment.fileType)}
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        Xem
                                                                    </Button>

                                                                    <Button
                                                                        className="rounded-2xl"
                                                                        onClick={() =>
                                                                            handleDownload(
                                                                                attachment.fileUrl,
                                                                                attachment.fileName
                                                                            )
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
                                                                onClick={() =>
                                                                    deleteDocument(
                                                                        doc._id
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    }
                                )}
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div>
                        <Card className="sticky top-6 rounded-3xl border-0 shadow-md">
                            <CardContent className="p-6">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="rounded-2xl bg-emerald-500 p-3 text-white">
                                        <FileArchive className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold">
                                            Soạn thảo
                                            nhanh
                                        </h3>

                                        <p className="text-sm text-muted-foreground">
                                            Tạo thông
                                            báo hoặc
                                            nội quy
                                            mới
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        placeholder="Tiêu đề văn bản..."
                                        value={
                                            title
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setTitle(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                    <Input
                                        placeholder="Danh mục..."
                                        value={
                                            category
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setCategory(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                    <WordEditor
                                        content={editorContent}
                                        onChange={setEditorContent}
                                    />

                                    <Button
                                        className="h-11 w-full rounded-2xl"
                                        onClick={
                                            handleCreateDocument
                                        }
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Lưu văn bản
                                    </Button>
                                </div>

                                <div className="mt-6 rounded-2xl bg-muted p-4">
                                    <h4 className="mb-2 font-medium">
                                        Hỗ trợ
                                        file
                                    </h4>

                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>
                                            • PDF
                                            (.pdf)
                                        </p>

                                        <p>
                                            • Word
                                            (.docx)
                                        </p>

                                        <p>
                                            • Excel
                                            (.xlsx)
                                        </p>

                                        <p>
                                            • Xem
                                            trực tiếp
                                            trên web
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}