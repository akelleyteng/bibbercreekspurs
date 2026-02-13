import { Visibility } from '../enums/visibility.enum';
export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    authorId: string;
    visibility: Visibility;
    featuredImageUrl?: string;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export interface BlogPostWithAuthor extends BlogPost {
    author: {
        id: string;
        firstName: string;
        lastName: string;
        profileImageUrl?: string;
    };
}
export interface CreateBlogPostRequest {
    title: string;
    content: string;
    excerpt?: string;
    visibility: Visibility;
    featuredImageUrl?: string;
    publishedAt?: Date;
    publishToFacebook?: boolean;
}
export interface UpdateBlogPostRequest {
    title?: string;
    content?: string;
    excerpt?: string;
    visibility?: Visibility;
    featuredImageUrl?: string;
    publishedAt?: Date;
}
//# sourceMappingURL=blog.types.d.ts.map