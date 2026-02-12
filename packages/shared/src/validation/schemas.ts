import { z } from 'zod';
import { Role } from '../enums/roles.enum';
import { Visibility, ReactionType } from '../enums/visibility.enum';

// User Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  profileImageUrl: z.string().url().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Event Schemas
export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  location: z.string().optional(),
  visibility: z.nativeEnum(Visibility),
  publishToGoogleCalendar: z.boolean().optional(),
  publishToFacebook: z.boolean().optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const updateEventSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  location: z.string().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
});

// Blog Schemas
export const createBlogPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  excerpt: z.string().max(500).optional(),
  visibility: z.nativeEnum(Visibility),
  featuredImageUrl: z.string().url().optional(),
  publishedAt: z.coerce.date().optional(),
  publishToFacebook: z.boolean().optional(),
});

export const updateBlogPostSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(50).optional(),
  excerpt: z.string().max(500).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  featuredImageUrl: z.string().url().optional(),
  publishedAt: z.coerce.date().optional(),
});

// Post (Social Feed) Schemas
export const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
  visibility: z.nativeEnum(Visibility).optional().default(Visibility.MEMBER_ONLY),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const addReactionSchema = z.object({
  reactionType: z.nativeEnum(ReactionType),
});

// Content Schemas
export const updateHomeContentSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1, 'Content is required'),
  imageUrl: z.string().url().optional(),
});

export const createSponsorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  logoUrl: z.string().url('Invalid logo URL'),
  websiteUrl: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateSponsorSchema = createSponsorSchema.partial();

export const createTestimonialSchema = z.object({
  authorName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  authorRole: z.string().max(100).optional(),
  content: z.string().min(10, 'Testimonial must be at least 10 characters').max(1000),
  imageUrl: z.string().url().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Admin Schemas
export const changeRoleSchema = z.object({
  newRole: z.nativeEnum(Role),
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const searchSchema = paginationSchema.extend({
  query: z.string().optional(),
});
