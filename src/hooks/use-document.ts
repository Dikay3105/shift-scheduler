import { useCallback, useEffect, useState } from "react";
import { scheduleApi } from "@/services/api";

export type Attachment = {
  fileName: string;
  fileUrl: string;
  fileType: string;
};

export type DocumentItem = {
  _id: string;
  title: string;
  category: string;
  htmlContent: string;
  attachments: Attachment[];
  createdAt: string;
};

export type CreateDocumentPayload = {
  title: string;
  category?: string;
  htmlContent?: string;
  attachments?: Attachment[];
};

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.getDocuments();
      setDocuments(res || []);
    } catch (error) {
      console.error("fetchDocuments error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = useCallback(
    async (data: CreateDocumentPayload) => {
      await scheduleApi.createDocument(data);
      await fetchDocuments();
    },
    [fetchDocuments]
  );

  const updateDocument = useCallback(
    async (id: string, data: Partial<CreateDocumentPayload>) => {
      await scheduleApi.updateDocument(id, data);
      await fetchDocuments();
    },
    [fetchDocuments]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!confirm("Xóa văn bản này?")) return;
      await scheduleApi.deleteDocument(id);
      await fetchDocuments();
    },
    [fetchDocuments]
  );

  // uploadFile trả về Attachment object từ BE
  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
    return await scheduleApi.uploadDocumentFile(file);
  }, []);

  return {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    uploadFile,
    refresh: fetchDocuments,
  };
}