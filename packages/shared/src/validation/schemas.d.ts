import { z } from 'zod';
import { Role } from '../enums/roles.enum';
import { Visibility, ReactionType } from '../enums/visibility.enum';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}, {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    profileImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    profileImageUrl?: string | undefined;
    bio?: string | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    profileImageUrl?: string | undefined;
    bio?: string | undefined;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const createEventSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    startTime: z.ZodDate;
    endTime: z.ZodDate;
    location: z.ZodOptional<z.ZodString>;
    visibility: z.ZodNativeEnum<typeof Visibility>;
    publishToGoogleCalendar: z.ZodOptional<z.ZodBoolean>;
    publishToFacebook: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    visibility: Visibility;
    location?: string | undefined;
    publishToGoogleCalendar?: boolean | undefined;
    publishToFacebook?: boolean | undefined;
}, {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    visibility: Visibility;
    location?: string | undefined;
    publishToGoogleCalendar?: boolean | undefined;
    publishToFacebook?: boolean | undefined;
}>, {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    visibility: Visibility;
    location?: string | undefined;
    publishToGoogleCalendar?: boolean | undefined;
    publishToFacebook?: boolean | undefined;
}, {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    visibility: Visibility;
    location?: string | undefined;
    publishToGoogleCalendar?: boolean | undefined;
    publishToFacebook?: boolean | undefined;
}>;
export declare const updateEventSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startTime: z.ZodOptional<z.ZodDate>;
    endTime: z.ZodOptional<z.ZodDate>;
    location: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodNativeEnum<typeof Visibility>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    startTime?: Date | undefined;
    endTime?: Date | undefined;
    location?: string | undefined;
    visibility?: Visibility | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    startTime?: Date | undefined;
    endTime?: Date | undefined;
    location?: string | undefined;
    visibility?: Visibility | undefined;
}>;
export declare const createBlogPostSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    excerpt: z.ZodOptional<z.ZodString>;
    visibility: z.ZodNativeEnum<typeof Visibility>;
    featuredImageUrl: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodOptional<z.ZodDate>;
    publishToFacebook: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    visibility: Visibility;
    content: string;
    publishToFacebook?: boolean | undefined;
    excerpt?: string | undefined;
    featuredImageUrl?: string | undefined;
    publishedAt?: Date | undefined;
}, {
    title: string;
    visibility: Visibility;
    content: string;
    publishToFacebook?: boolean | undefined;
    excerpt?: string | undefined;
    featuredImageUrl?: string | undefined;
    publishedAt?: Date | undefined;
}>;
export declare const updateBlogPostSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    excerpt: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodNativeEnum<typeof Visibility>>;
    featuredImageUrl: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    visibility?: Visibility | undefined;
    content?: string | undefined;
    excerpt?: string | undefined;
    featuredImageUrl?: string | undefined;
    publishedAt?: Date | undefined;
}, {
    title?: string | undefined;
    visibility?: Visibility | undefined;
    content?: string | undefined;
    excerpt?: string | undefined;
    featuredImageUrl?: string | undefined;
    publishedAt?: Date | undefined;
}>;
export declare const createPostSchema: z.ZodObject<{
    content: z.ZodString;
    visibility: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof Visibility>>>;
}, "strip", z.ZodTypeAny, {
    visibility: Visibility;
    content: string;
}, {
    content: string;
    visibility?: Visibility | undefined;
}>;
export declare const updatePostSchema: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodNativeEnum<typeof Visibility>>;
}, "strip", z.ZodTypeAny, {
    visibility?: Visibility | undefined;
    content?: string | undefined;
}, {
    visibility?: Visibility | undefined;
    content?: string | undefined;
}>;
export declare const createCommentSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const addReactionSchema: z.ZodObject<{
    reactionType: z.ZodNativeEnum<typeof ReactionType>;
}, "strip", z.ZodTypeAny, {
    reactionType: ReactionType;
}, {
    reactionType: ReactionType;
}>;
export declare const updateHomeContentSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    title?: string | undefined;
    imageUrl?: string | undefined;
}, {
    content: string;
    title?: string | undefined;
    imageUrl?: string | undefined;
}>;
export declare const createSponsorSchema: z.ZodObject<{
    name: z.ZodString;
    logoUrl: z.ZodString;
    websiteUrl: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    orderIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    logoUrl: string;
    description?: string | undefined;
    websiteUrl?: string | undefined;
    orderIndex?: number | undefined;
}, {
    name: string;
    logoUrl: string;
    description?: string | undefined;
    websiteUrl?: string | undefined;
    orderIndex?: number | undefined;
}>;
export declare const updateSponsorSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    websiteUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    orderIndex: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    logoUrl?: string | undefined;
    websiteUrl?: string | undefined;
    orderIndex?: number | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    logoUrl?: string | undefined;
    websiteUrl?: string | undefined;
    orderIndex?: number | undefined;
}>;
export declare const createTestimonialSchema: z.ZodObject<{
    authorName: z.ZodString;
    authorRole: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
    orderIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content: string;
    authorName: string;
    imageUrl?: string | undefined;
    orderIndex?: number | undefined;
    authorRole?: string | undefined;
}, {
    content: string;
    authorName: string;
    imageUrl?: string | undefined;
    orderIndex?: number | undefined;
    authorRole?: string | undefined;
}>;
export declare const updateTestimonialSchema: z.ZodObject<{
    authorName: z.ZodOptional<z.ZodString>;
    authorRole: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    content: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    orderIndex: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
} & {
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    content?: string | undefined;
    imageUrl?: string | undefined;
    orderIndex?: number | undefined;
    authorName?: string | undefined;
    authorRole?: string | undefined;
}, {
    isActive?: boolean | undefined;
    content?: string | undefined;
    imageUrl?: string | undefined;
    orderIndex?: number | undefined;
    authorName?: string | undefined;
    authorRole?: string | undefined;
}>;
export declare const changeRoleSchema: z.ZodObject<{
    newRole: z.ZodNativeEnum<typeof Role>;
}, "strip", z.ZodTypeAny, {
    newRole: Role;
}, {
    newRole: Role;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const searchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
} & {
    query: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
    query?: string | undefined;
    sortBy?: string | undefined;
}, {
    query?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map