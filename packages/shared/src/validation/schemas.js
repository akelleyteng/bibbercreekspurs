"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSchema = exports.paginationSchema = exports.changeRoleSchema = exports.updateTestimonialSchema = exports.createTestimonialSchema = exports.updateSponsorSchema = exports.createSponsorSchema = exports.updateHomeContentSchema = exports.addReactionSchema = exports.createCommentSchema = exports.updatePostSchema = exports.createPostSchema = exports.updateBlogPostSchema = exports.createBlogPostSchema = exports.updateEventSchema = exports.createEventSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const roles_enum_1 = require("../enums/roles.enum");
const visibility_enum_1 = require("../enums/visibility.enum");
// User Schemas
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters'),
    lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2).optional(),
    lastName: zod_1.z.string().min(2).optional(),
    bio: zod_1.z.string().max(500).optional(),
    profileImageUrl: zod_1.z.string().url().optional(),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
// Event Schemas
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(255),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    startTime: zod_1.z.coerce.date(),
    endTime: zod_1.z.coerce.date(),
    location: zod_1.z.string().optional(),
    visibility: zod_1.z.nativeEnum(visibility_enum_1.Visibility),
    publishToGoogleCalendar: zod_1.z.boolean().optional(),
    publishToFacebook: zod_1.z.boolean().optional(),
}).refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
});
exports.updateEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(255).optional(),
    description: zod_1.z.string().min(10).optional(),
    startTime: zod_1.z.coerce.date().optional(),
    endTime: zod_1.z.coerce.date().optional(),
    location: zod_1.z.string().optional(),
    visibility: zod_1.z.nativeEnum(visibility_enum_1.Visibility).optional(),
});
// Blog Schemas
exports.createBlogPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(255),
    content: zod_1.z.string().min(50, 'Content must be at least 50 characters'),
    excerpt: zod_1.z.string().max(500).optional(),
    visibility: zod_1.z.nativeEnum(visibility_enum_1.Visibility),
    featuredImageUrl: zod_1.z.string().url().optional(),
    publishedAt: zod_1.z.coerce.date().optional(),
    publishToFacebook: zod_1.z.boolean().optional(),
});
exports.updateBlogPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(255).optional(),
    content: zod_1.z.string().min(50).optional(),
    excerpt: zod_1.z.string().max(500).optional(),
    visibility: zod_1.z.nativeEnum(visibility_enum_1.Visibility).optional(),
    featuredImageUrl: zod_1.z.string().url().optional(),
    publishedAt: zod_1.z.coerce.date().optional(),
});
// Post (Social Feed) Schemas
exports.createPostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Content is required').max(5000),
    visibility: zod_1.z.nativeEnum(visibility_enum_1.Visibility).optional().default(visibility_enum_1.Visibility.MEMBER_ONLY),
});
exports.updatePostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(5000).optional(),
    visibility: zod_1.z.nativeEnum(visibility_enum_1.Visibility).optional(),
});
exports.createCommentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Comment cannot be empty').max(2000),
});
exports.addReactionSchema = zod_1.z.object({
    reactionType: zod_1.z.nativeEnum(visibility_enum_1.ReactionType),
});
// Content Schemas
exports.updateHomeContentSchema = zod_1.z.object({
    title: zod_1.z.string().max(255).optional(),
    content: zod_1.z.string().min(1, 'Content is required'),
    imageUrl: zod_1.z.string().url().optional(),
});
exports.createSponsorSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(255),
    logoUrl: zod_1.z.string().url('Invalid logo URL'),
    websiteUrl: zod_1.z.string().url().optional(),
    description: zod_1.z.string().max(1000).optional(),
    orderIndex: zod_1.z.number().int().min(0).optional(),
});
exports.updateSponsorSchema = exports.createSponsorSchema.partial();
exports.createTestimonialSchema = zod_1.z.object({
    authorName: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(255),
    authorRole: zod_1.z.string().max(100).optional(),
    content: zod_1.z.string().min(10, 'Testimonial must be at least 10 characters').max(1000),
    imageUrl: zod_1.z.string().url().optional(),
    orderIndex: zod_1.z.number().int().min(0).optional(),
});
exports.updateTestimonialSchema = exports.createTestimonialSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
// Admin Schemas
exports.changeRoleSchema = zod_1.z.object({
    newRole: zod_1.z.nativeEnum(roles_enum_1.Role),
});
// Pagination Schema
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
exports.searchSchema = exports.paginationSchema.extend({
    query: zod_1.z.string().optional(),
});
//# sourceMappingURL=schemas.js.map