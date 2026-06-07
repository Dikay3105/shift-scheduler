export type AiPostProduct = {
    productId: string;
    code: string;
    name: string;
};

export type AiPostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
export type AiPostPlatform = 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'zalo';
export type AiPostTone = 'friendly' | 'promo' | 'premium' | 'story' | 'professional';

export type AiPost = {
    _id: string;
    content: string;
    imageUrl: string | null;
    platform: AiPostPlatform;
    tone: AiPostTone;
    products: AiPostProduct[];
    extraNote: string;
    status: AiPostStatus;
    scheduledAt: string | null;
    publishedAt: string | null;
    fbPostId: string | null;
    fbPostUrl: string | null;
    errorMessage: string | null;
    retryCount: number;
    aiMeta: {
        platform?: string;
        tone?: string;
        model?: string;
    } | null;
    createdAt: string;
    updatedAt: string;
};

export type CreateAiPostPayload = {
    content: string;
    platform: AiPostPlatform;
    tone: AiPostTone;
    products: AiPostProduct[];
    extraNote?: string;
    scheduledAt?: string;
    aiMeta?: AiPost['aiMeta'];
    // imageUrls không cần gửi nữa, backend tự xử lý từ file upload
};

export type UpdateAiPostPayload = Partial<CreateAiPostPayload> & {
    keepImageUrls?: string[]; // ảnh cũ muốn giữ lại
};

export type AiPostFilters = {
    status?: AiPostStatus;
    platform?: AiPostPlatform;
    tone?: AiPostTone;
    page?: number;
    limit?: number;
};

export type AiPostsResponse = {
    success: boolean;
    data: AiPost[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
};