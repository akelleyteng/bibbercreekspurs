import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { BlogPostGQL, BlogAuthor, BlogGuidelinesGQL } from '../types/Blog.type';
import { CreateBlogPostInput, UpdateBlogPostInput, UpdateBlogGuidelinesInput } from '../inputs/BlogInput';
import { BlogPostRepository, BlogPostRow } from '../../repositories/blog.repository';
import { BlogGuidelinesRepository } from '../../repositories/blog-guidelines.repository';
import { PostRepository } from '../../repositories/post.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import db from '../../models/database';

@Resolver()
export class BlogResolver {
  private blogPostRepo: BlogPostRepository;
  private guidelinesRepo: BlogGuidelinesRepository;
  private userRepo: UserRepository;

  private postRepo: PostRepository;

  constructor() {
    this.blogPostRepo = new BlogPostRepository();
    this.guidelinesRepo = new BlogGuidelinesRepository();
    this.postRepo = new PostRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: BlogPostRow): BlogPostGQL {
    const author: BlogAuthor = {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
      profileImageUrl: row.author_profile_image_url,
      role: row.author_role,
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
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason,
      reviewedAt: row.reviewed_at,
      author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Returns { userId, role } for any authenticated user, throws if not authenticated */
  private async requireAuth(context: Context): Promise<{ userId: string; role: Role }> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);
    if (!user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return { userId: payload.userId, role: user.role };
  }

  private async requireAdmin(context: Context): Promise<string> {
    const { userId, role } = await this.requireAuth(context);
    if (role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return userId;
  }

  /** Returns true if parentId has a family_link to childId */
  private async isParentOf(parentId: string, childId: string): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM family_links WHERE parent_user_id = $1 AND child_user_id = $2) AS exists`,
      [parentId, childId]
    );
    return result.rows[0]?.exists === true;
  }

  /** Returns child user IDs for a given parent */
  private async getChildIds(parentId: string): Promise<string[]> {
    const result = await db.query<{ child_user_id: string }>(
      `SELECT child_user_id FROM family_links WHERE parent_user_id = $1`,
      [parentId]
    );
    return result.rows.map((r) => r.child_user_id);
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
    const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped.length <= 200) return stripped;
    return stripped.substring(0, 200) + '...';
  }

  private assertContentNotEmpty(content: string): void {
    const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!stripped) {
      throw new GraphQLError('Blog post content cannot be empty', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  @Query(() => [BlogPostGQL])
  async blogPosts(
    @Arg('publicOnly', { nullable: true, defaultValue: false }) publicOnly: boolean,
    @Ctx() context: Context
  ): Promise<BlogPostGQL[]> {
    let userId: string | null = null;
    let role: Role | null = null;

    const authHeader = context.req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(authHeader.substring(7));
        const user = await this.userRepo.findById(payload.userId);
        if (user) {
          userId = payload.userId;
          role = user.role;
        }
      } catch {
        // unauthenticated — treat as public
      }
    }

    if (!userId || publicOnly) {
      const rows = await this.blogPostRepo.findApprovedPublishedPublic();
      return rows.map((r) => this.mapRow(r));
    }

    if (role === Role.ADMIN || role === Role.ADULT_LEADER) {
      const rows = await this.blogPostRepo.findAll();
      return rows.map((r) => this.mapRow(r));
    }

    // Authenticated member: APPROVED+published + own posts (any status)
    const [approved, own] = await Promise.all([
      this.blogPostRepo.findApprovedPublished(),
      this.blogPostRepo.findByAuthorId(userId),
    ]);

    const seen = new Set<string>();
    const merged: BlogPostRow[] = [];
    for (const row of [...own, ...approved]) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        merged.push(row);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged.map((r) => this.mapRow(r));
  }

  @Query(() => BlogPostGQL, { nullable: true })
  async blogPost(
    @Arg('slug') slug: string,
    @Ctx() context: Context
  ): Promise<BlogPostGQL | null> {
    const row = await this.blogPostRepo.findBySlug(slug);
    if (!row) return null;

    if (row.approval_status === 'APPROVED') {
      return this.mapRow(row);
    }

    // PENDING or REJECTED: only visible to author, ADMIN, ADULT_LEADER, or parent-of-author
    const authHeader = context.req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
      const payload = verifyAccessToken(authHeader.substring(7));
      const user = await this.userRepo.findById(payload.userId);
      if (!user) return null;

      if (
        payload.userId === row.author_id ||
        user.role === Role.ADMIN ||
        user.role === Role.ADULT_LEADER
      ) {
        return this.mapRow(row);
      }

      if (user.role === Role.PARENT) {
        const isParent = await this.isParentOf(payload.userId, row.author_id);
        if (isParent) return this.mapRow(row);
      }
    } catch {
      // invalid token
    }

    return null;
  }

  @Query(() => [BlogPostGQL])
  async myBlogPosts(@Ctx() context: Context): Promise<BlogPostGQL[]> {
    const { userId } = await this.requireAuth(context);
    const rows = await this.blogPostRepo.findByAuthorId(userId);
    return rows.map((r) => this.mapRow(r));
  }

  @Query(() => [BlogPostGQL])
  async pendingBlogPosts(@Ctx() context: Context): Promise<BlogPostGQL[]> {
    const { userId, role } = await this.requireAuth(context);

    if (role === Role.ADMIN || role === Role.ADULT_LEADER) {
      const rows = await this.blogPostRepo.findAllPending();
      return rows.map((r) => this.mapRow(r));
    }

    if (role === Role.PARENT) {
      const childIds = await this.getChildIds(userId);
      const rows = await this.blogPostRepo.findPendingByAuthorIds(childIds);
      return rows.map((r) => this.mapRow(r));
    }

    return [];
  }

  @Query(() => BlogGuidelinesGQL, { nullable: true })
  async blogGuidelines(): Promise<BlogGuidelinesGQL | null> {
    const row = await this.guidelinesRepo.findCurrent();
    if (!row) return null;
    return { id: row.id, content: row.content, updatedAt: row.updated_at };
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Mutation(() => BlogPostGQL)
  async createBlogPost(
    @Arg('input') input: CreateBlogPostInput,
    @Ctx() context: Context
  ): Promise<BlogPostGQL> {
    const { userId, role } = await this.requireAuth(context);

    const isPrivileged = role === Role.ADMIN || role === Role.ADULT_LEADER;

    if (!isPrivileged && !input.guidelinesAgreed) {
      throw new GraphQLError('You must agree to the blog posting guidelines', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    this.assertContentNotEmpty(input.content);

    const slug = this.slugify(input.title);
    const excerpt = input.excerpt || this.generateExcerpt(input.content);
    const approvalStatus = isPrivileged ? 'APPROVED' : 'PENDING';
    const publishedAt = isPrivileged && input.publishedAt ? new Date(input.publishedAt) : undefined;

    const row = await this.blogPostRepo.create({
      title: input.title,
      slug,
      content: input.content,
      excerpt,
      author_id: userId,
      visibility: input.visibility,
      featured_image_url: input.featuredImageUrl,
      published_at: publishedAt,
      approval_status: approvalStatus,
    });

    // Auto-set published_at for privileged users who didn't specify one
    if (isPrivileged && !publishedAt) {
      await this.blogPostRepo.update(row.id, { published_at: new Date() });
      return this.mapRow((await this.blogPostRepo.findById(row.id))!);
    }

    return this.mapRow(row);
  }

  @Mutation(() => BlogPostGQL)
  async updateBlogPost(
    @Arg('id') id: string,
    @Arg('input') input: UpdateBlogPostInput,
    @Ctx() context: Context
  ): Promise<BlogPostGQL> {
    const { userId, role } = await this.requireAuth(context);

    const existing = await this.blogPostRepo.findById(id);
    if (!existing) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const isPrivileged = role === Role.ADMIN || role === Role.ADULT_LEADER;
    const isAuthor = existing.author_id === userId;

    if (!isPrivileged && !isAuthor) {
      throw new GraphQLError('You do not have permission to edit this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (input.content !== undefined) {
      this.assertContentNotEmpty(input.content);
    }

    const data: Record<string, any> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.excerpt !== undefined) data.excerpt = input.excerpt;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.featuredImageUrl !== undefined) data.featured_image_url = input.featuredImageUrl;

    if (isPrivileged && input.publishedAt !== undefined) {
      data.published_at = input.publishedAt ? new Date(input.publishedAt) : null;
    }

    if (input.title !== undefined && input.slug === undefined) {
      data.slug = this.slugify(input.title);
    }
    if (input.slug !== undefined) {
      data.slug = input.slug;
    }

    // When the author (non-privileged) edits their post, reset approval status
    if (isAuthor && !isPrivileged) {
      data.approval_status = 'PENDING';
      data.reviewed_by = null;
      data.reviewed_at = null;
      data.rejection_reason = null;
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
    const { userId, role } = await this.requireAuth(context);

    const existing = await this.blogPostRepo.findById(id);
    if (!existing) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const isPrivileged = role === Role.ADMIN || role === Role.ADULT_LEADER;
    const isAuthor = existing.author_id === userId;

    if (!isPrivileged && !isAuthor) {
      throw new GraphQLError('You do not have permission to delete this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const deleted = await this.blogPostRepo.softDelete(id);
    if (!deleted) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }

  @Mutation(() => BlogPostGQL)
  async approveBlogPost(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<BlogPostGQL> {
    const { userId, role } = await this.requireAuth(context);

    const existing = await this.blogPostRepo.findById(id);
    if (!existing) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const canApprove =
      role === Role.ADMIN ||
      role === Role.ADULT_LEADER ||
      (role === Role.PARENT && (await this.isParentOf(userId, existing.author_id)));

    if (!canApprove) {
      throw new GraphQLError('You do not have permission to approve this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updateData: Record<string, any> = {
      approval_status: 'APPROVED',
      reviewed_by: userId,
      reviewed_at: new Date(),
      rejection_reason: null,
    };

    if (!existing.published_at) {
      updateData.published_at = new Date();
    }

    const row = await this.blogPostRepo.update(id, updateData);
    if (!row) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    logger.info(`Blog post ${id} approved by user ${userId}`);

    // Auto-create a social feed post announcing the blog post (only on first approval)
    if (existing.approval_status !== 'APPROVED') {
      try {
        const authorName = `${existing.author_first_name} ${existing.author_last_name}`;
        const excerpt = row!.excerpt || '';
        const teaser = excerpt.length > 200 ? excerpt.substring(0, 200) + '...' : excerpt;
        const content = `<p><strong>${authorName}</strong> created a new blog post!</p><p><em>${row!.title}</em></p>${teaser ? `<p>${teaser}</p>` : ''}`;
        await this.postRepo.create({
          author_id: existing.author_id,
          content,
          visibility: existing.visibility === 'PUBLIC' ? 'PUBLIC' : 'MEMBER_ONLY',
          blog_post_id: id,
        });
      } catch (err) {
        logger.warn(`Failed to create social post for blog post ${id}: ${err}`);
      }
    }

    return this.mapRow(row!);
  }

  @Mutation(() => BlogPostGQL)
  async rejectBlogPost(
    @Arg('id') id: string,
    @Arg('reason', () => String, { nullable: true }) reason: string | undefined,
    @Ctx() context: Context
  ): Promise<BlogPostGQL> {
    const { userId, role } = await this.requireAuth(context);

    const existing = await this.blogPostRepo.findById(id);
    if (!existing) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const canReject =
      role === Role.ADMIN ||
      role === Role.ADULT_LEADER ||
      (role === Role.PARENT && (await this.isParentOf(userId, existing.author_id)));

    if (!canReject) {
      throw new GraphQLError('You do not have permission to reject this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const row = await this.blogPostRepo.update(id, {
      approval_status: 'REJECTED',
      reviewed_by: userId,
      reviewed_at: new Date(),
      rejection_reason: reason || null,
    });

    if (!row) {
      throw new GraphQLError('Blog post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    logger.info(`Blog post ${id} rejected by user ${userId}`);
    return this.mapRow(row);
  }

  @Mutation(() => BlogGuidelinesGQL)
  async updateBlogGuidelines(
    @Arg('input') input: UpdateBlogGuidelinesInput,
    @Ctx() context: Context
  ): Promise<BlogGuidelinesGQL> {
    const userId = await this.requireAdmin(context);
    const row = await this.guidelinesRepo.upsert(input.content, userId);
    return { id: row.id, content: row.content, updatedAt: row.updated_at };
  }
}
