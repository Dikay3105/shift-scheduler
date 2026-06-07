import type {
    AiPost,
    AiPostFilters,
    AiPostsResponse,
    CreateAiPostPayload,
    UpdateAiPostPayload,
} from '@/types/aiPost';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const buildQuery = (filters: AiPostFilters) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.tone) params.set('tone', filters.tone);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    return params.toString();
};

export const aiPostApi = {
    getPosts: async (filters: AiPostFilters = {}): Promise<AiPostsResponse> => {
        const q = buildQuery(filters);
        const res = await fetch(`${API_BASE}/posts/schedule${q ? `?${q}` : ''}`);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    getPost: async (id: string): Promise<{ success: boolean; data: AiPost }> => {
        const res = await fetch(`${API_BASE}/posts/schedule/${id}`);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    createPost: async (data: CreateAiPostPayload, images?: File[]): Promise<{ success: boolean; data: AiPost }> => {
        const formData = new FormData();

        // Append các field text
        Object.entries(data).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        });

        // Append ảnh
        images?.forEach(file => formData.append('images', file));

        const res = await fetch(`${API_BASE}/posts/schedule`, {
            method: 'POST',
            body: formData, // KHÔNG set Content-Type, browser tự set boundary
        });
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    updatePost: async (id: string, data: UpdateAiPostPayload, images?: File[], keepImageUrls?: string[]): Promise<{ success: boolean; data: AiPost }> => {
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        });

        images?.forEach(file => formData.append('images', file));

        if (keepImageUrls) {
            formData.append('keepImageUrls', JSON.stringify(keepImageUrls));
        }

        const res = await fetch(`${API_BASE}/posts/schedule/${id}`, {
            method: 'PUT',
            body: formData,
        });
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    deletePost: async (id: string): Promise<{ success: boolean }> => {
        const res = await fetch(`${API_BASE}/posts/schedule/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    // Thêm vào aiPostApi trong aiPostApi.ts
    deletePostCompletely: async (id: string): Promise<{ success: boolean }> => {
        const res = await fetch(`${API_BASE}/posts/schedule/${id}/completely`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    cancelPost: async (id: string): Promise<{ success: boolean; data: AiPost }> => {
        const res = await fetch(`${API_BASE}/posts/schedule/${id}/cancel`, { method: 'POST' }); // POST, không phải PUT
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    retryPost: async (id: string): Promise<{ success: boolean; data: AiPost }> => {
        const res = await fetch(`${API_BASE}/posts/schedule/${id}/retry`, { method: 'POST' }); // POST, không phải PUT
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    getQueueStats: async (): Promise<{ success: boolean; data: { waiting: number; active: number; completed: number; failed: number; delayed: number } }> => {
        const res = await fetch(`${API_BASE}/posts/schedule/queue/stats`);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },

    generateContent: async (data: {
        products: { code: string; name: string; unit?: string; price?: string; description?: string }[];
        platform: string;
        tone: string;
        extraNote?: string;
        customPrompt?: string;
        brand?: string;
    }): Promise<{ success: boolean; data: { content: string; model: string; platform: string; tone: string } }> => {
        const res = await fetch(`${API_BASE}/ai/content`, { // /api/ai/content — đúng rồi, giữ nguyên
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
    },
};