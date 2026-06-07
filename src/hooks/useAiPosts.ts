import { useCallback, useEffect, useState } from 'react';
import { aiPostApi } from '@/services/aiPostApi';
import type { AiPost, AiPostFilters, CreateAiPostPayload, UpdateAiPostPayload } from '@/types/aiPost';

export function useAiPosts(initialFilters: AiPostFilters = {}) {
    const [posts, setPosts] = useState<AiPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const [filters, setFilters] = useState<AiPostFilters>(initialFilters);

    const fetchPosts = useCallback(async (overrideFilters?: AiPostFilters) => {
        try {
            setLoading(true);
            setError(null);
            const res = await aiPostApi.getPosts(overrideFilters ?? filters);
            setPosts(res.data ?? []);
            setPagination(res.pagination);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const createPost = useCallback(async (data: CreateAiPostPayload, images?: File[]) => {
        if (!data.products?.length) throw new Error('Cần ít nhất 1 sản phẩm');
        const res = await aiPostApi.createPost(data, images);
        await fetchPosts();
        return res.data;
    }, [fetchPosts]);

    // Refetch sau update để lấy status/jobId mới nhất từ server
    const updatePost = useCallback(async (
        id: string,
        data: UpdateAiPostPayload,
        images?: File[],
        keepImageUrls?: string[],
    ) => {
        const res = await aiPostApi.updatePost(id, data, images, keepImageUrls);
        await fetchPosts();
        return res.data;
    }, [fetchPosts]);

    // Xóa khỏi DB + queue (không xóa bài Facebook)
    const deletePost = useCallback(async (id: string) => {
        if (!confirm('Xoá bài viết này?')) return;
        await aiPostApi.deletePost(id);
        setPosts(prev => prev.filter(p => p._id !== id));
    }, []);

    // Xóa hoàn toàn: DB + queue + bài viết trên Facebook
    const deletePostCompletely = useCallback(async (id: string) => {
        if (!confirm('Xoá bài viết này và gỡ luôn trên Facebook?')) return;
        await aiPostApi.deletePostCompletely(id);
        setPosts(prev => prev.filter(p => p._id !== id));
    }, []);

    const cancelPost = useCallback(async (id: string) => {
        const res = await aiPostApi.cancelPost(id);
        setPosts(prev => prev.map(p => p._id === id ? res.data : p));
    }, []);

    const retryPost = useCallback(async (id: string) => {
        const res = await aiPostApi.retryPost(id);
        setPosts(prev => prev.map(p => p._id === id ? res.data : p));
    }, []);

    // Reset page về 1 khi đổi filter
    const applyFilters = useCallback((newFilters: AiPostFilters) => {
        setFilters({ ...newFilters, page: 1 });
    }, []);

    const changePage = useCallback((page: number) => {
        setFilters(prev => ({ ...prev, page }));
    }, []);

    return {
        posts,
        loading,
        error,
        pagination,
        filters,
        applyFilters,
        changePage,
        createPost,
        updatePost,
        deletePost,
        deletePostCompletely,
        cancelPost,
        retryPost,
        refresh: fetchPosts,
    };
}