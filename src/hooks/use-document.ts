import { useCallback, useEffect, useState } from "react";

import { scheduleApi } from "@/services/api";

export type DocumentItem = {
  _id: string;
  title: string;
  category: string;
  htmlContent: string;

  attachments: {
    fileName: string;
    fileUrl: string;
    fileType: string;
  }[];

  createdAt: string;
};

export function useDocuments() {
  const [documents, setDocuments] = useState<
    DocumentItem[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const fetchDocuments = useCallback(
    async () => {
      try {
        setLoading(true);

        const res =
          await scheduleApi.getDocuments();

        setDocuments(res || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = useCallback(
    async (data: any) => {
      await scheduleApi.createDocument(data);

      await fetchDocuments();
    },
    [fetchDocuments]
  );

  const updateDocument = useCallback(
    async (id: string, data: any) => {
      await scheduleApi.updateDocument(
        id,
        data
      );

      await fetchDocuments();
    },
    [fetchDocuments]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!confirm("Xóa văn bản này?"))
        return;

      await scheduleApi.deleteDocument(id);

      await fetchDocuments();
    },
    [fetchDocuments]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      return await scheduleApi.uploadDocumentFile(
        file
      );
    },
    []
  );

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