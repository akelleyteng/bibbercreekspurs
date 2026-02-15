import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { BlogPostGQL, BlogAuthor } from '../types/Blog.type';
import { CreateBlogPostInput, UpdateBlogPostInput } from '../inputs/BlogInput';
import { BlogPostRepository, BlogPostRow } from '../../repositories/blog.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class BlogResolver {
  private blogPostRepo: BlogPostRepository;
  private userRepo: UserRepository;

  constructor() {
    this.blogPostRepo = new BlogPostRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: BlogPostRow): BlogPostGQL {
    const author: BlogAuthor = {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
      profileImageUrl: row.author_profile_image_url,
    };

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      visibility: row.visibility,
      featuredImageUrl: row.featured_image_url,
      publishedAt: row.published_at,
      author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async requireAdmin(context: Context): Promise<string> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);

    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return payload.userId;
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateExcerpt(content: string): string {
    if (content.length <= 200) return content;
    return content.substring(0, 200) + '...';
  }

  @Query(() => [BlogPostGQL])
  async blogPosts(
    @Arg('publicOnly', { nullable: true, defaultValue: false }) publicOnly: boolean
  ): Promise<BlogPostGQL[]> {
    const rows = publicOnly
      ? await this.blogPostRepo.findPublicPublished()
      : await this.blogPostRepo.findAll();
    return rows.map((row) => this.mapRow(row));
  }

  @Query(() => BlogPostGQL, { nullable: true })
  async blogPost(
    @Arg('slug') slug: string
  ): Promise<BlogPostGQL | null> {
    const row = await this.blogPostRepo.findBySlug(slug);
    if (!row) return null;
    return this.mapRow(row);
  }

  @Mutation(() => BlogPostGQL)
  async createBlogPost(
    @Arg('input') input: CreateBlogPostInput,
    @Ctx() context: Context
  ): Promise<BlogPostGQL> {
    const userId = await this.requireAdmin(context);

    const slug = this.slugify(input.title);
    const excerpt = input.excerpt || this.generateExcerpt(input.content);

    const row = await this.blogPostRepo.create({
      title: input.title,
      slug,
      content: input.content,
      excerpt,
      author_id: userId,
      visibility: input.visibility,
      featured_image_url: input.featuredImageUrl,
      published_at: input.publishedAt ? new Date(input.publishedAt) : undefined,
    });

    return this.mapRow(row);
  }

  @Mutation(() => BlogPostGQL)
  async updateBlogPost(
    @Arg('id') id: string,
    @Arg('input') input: UpdateBlogPostInput,
    @Ctx() context: Context
  ): Promise<BlogPostGQL> {
    await this.requireAdmin(context);

    const data: Record<string, any> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.excerpt !== undefined) data.excerpt = input.excerpt;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.featuredImageUrl !== undefined) data.featured_image_url = input.featuredImageUrl;
    if (input.publishedAt !== undefined) data.published_at = input.publishedAt ? new Date(input.publishedAt) : null;

    // Auto-regenerate slug if title changes (unless slug explicitly provided)
    if (input.title !== undefined && input.slug === undefined) {
      data.slug = this.slugify(input.title);
    }
    if (input.slug !== undefined) {
      data.slug = input.slug;
    }

    const row = await this.blogPostRepo.update(id, data);

    if (!row) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapRow(row);
  }

  @Mutation(() => Boolean)
  async deleteBlogPost(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const deleted = await this.blogPostRepo.softDelete(id);

    if (!deleted) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }
}
