import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { PostGQL, PostAuthor, CommentGQL, ReactionSummaryGQL } from '../types/Post.type';
import { CreatePostInput, UpdatePostInput } from '../inputs/PostInput';
import { PostRepository, PostRow, CommentRow } from '../../repositories/post.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class PostResolver {
  private postRepo: PostRepository;
  private userRepo: UserRepository;

  constructor() {
    this.postRepo = new PostRepository();
    this.userRepo = new UserRepository();
  }

  private async requireAuth(context: Context): Promise<{ userId: string; role: string }> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return { userId: payload.userId, role: user.role };
  }

  private sanitizeHtml(html: string): string {
    // Strip dangerous tags and attributes as defense-in-depth
    // The frontend Tiptap editor constrains markup, but we sanitize server-side too
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/javascript\s*:/gi, '');
  }

  private mapAuthor(row: { author_id: string; author_first_name: string; author_last_name: string; author_profile_photo_url: string | null }): PostAuthor {
    return {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
      profilePhotoUrl: row.author_profile_photo_url || undefined,
    };
  }

  private mapComment(row: CommentRow): CommentGQL {
    return {
      id: row.id,
      postId: row.post_id,
      author: {
        id: row.author_id,
        firstName: row.author_first_name,
        lastName: row.author_last_name,
        profilePhotoUrl: row.author_profile_photo_url || undefined,
      },
      content: row.content,
      createdAt: row.created_at,
    };
  }

  private mapPost(
    row: PostRow,
    comments: CommentGQL[],
    reactions: ReactionSummaryGQL[],
    userReaction: string | undefined,
    canEdit: boolean
  ): PostGQL {
    return {
      id: row.id,
      author: this.mapAuthor(row),
      content: row.content,
      visibility: row.visibility,
      isHidden: row.is_hidden,
      hiddenAt: row.hidden_at || undefined,
      comments,
      reactions,
      userReaction,
      canEdit,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  @Query(() => [PostGQL])
  async posts(@Ctx() context: Context): Promise<PostGQL[]> {
    const { userId, role } = await this.requireAuth(context);
    const isAdmin = role === Role.ADMIN;

    const rows = await this.postRepo.findAll(isAdmin);
    if (rows.length === 0) return [];

    const postIds = rows.map(r => r.id);

    // Batch fetch comments, reactions, and user reactions
    const [allComments, allReactions, allUserReactions] = await Promise.all([
      this.postRepo.findCommentsByPostIds(postIds),
      this.postRepo.getReactionSummaries(postIds),
      this.postRepo.getUserReactions(postIds, userId),
    ]);

    // Group by post ID
    const commentsByPost = new Map<string, CommentGQL[]>();
    for (const c of allComments) {
      const list = commentsByPost.get(c.post_id) || [];
      list.push(this.mapComment(c));
      commentsByPost.set(c.post_id, list);
    }

    const reactionsByPost = new Map<string, ReactionSummaryGQL[]>();
    for (const r of allReactions) {
      const list = reactionsByPost.get(r.post_id) || [];
      list.push({ reactionType: r.reaction_type, count: parseInt(r.count, 10) });
      reactionsByPost.set(r.post_id, list);
    }

    const userReactionByPost = new Map<string, string>();
    for (const ur of allUserReactions) {
      userReactionByPost.set(ur.post_id, ur.reaction_type);
    }

    return rows.map(row => this.mapPost(
      row,
      commentsByPost.get(row.id) || [],
      reactionsByPost.get(row.id) || [],
      userReactionByPost.get(row.id),
      userId === row.author_id || isAdmin
    ));
  }

  @Query(() => PostGQL, { nullable: true })
  async post(
    @Arg('id', () => String) id: string,
    @Ctx() context: Context
  ): Promise<PostGQL | null> {
    const { userId, role } = await this.requireAuth(context);
    const isAdmin = role === Role.ADMIN;

    const row = await this.postRepo.findById(id);
    if (!row) return null;
    if (row.is_hidden && !isAdmin) return null;

    const [comments, reactions, userReactions] = await Promise.all([
      this.postRepo.findCommentsByPostIds([id]),
      this.postRepo.getReactionSummaries([id]),
      this.postRepo.getUserReactions([id], userId),
    ]);

    return this.mapPost(
      row,
      comments.map(c => this.mapComment(c)),
      reactions.map(r => ({ reactionType: r.reaction_type, count: parseInt(r.count, 10) })),
      userReactions[0]?.reaction_type,
      userId === row.author_id || isAdmin
    );
  }

  @Mutation(() => PostGQL)
  async createPost(
    @Arg('input') input: CreatePostInput,
    @Ctx() context: Context
  ): Promise<PostGQL> {
    const { userId } = await this.requireAuth(context);

    const sanitizedContent = this.sanitizeHtml(input.content);

    const row = await this.postRepo.create({
      author_id: userId,
      content: sanitizedContent,
      visibility: input.visibility,
    });

    return this.mapPost(row, [], [], undefined, true);
  }

  @Mutation(() => PostGQL)
  async updatePost(
    @Arg('id', () => String) id: string,
    @Arg('input') input: UpdatePostInput,
    @Ctx() context: Context
  ): Promise<PostGQL> {
    const { userId, role } = await this.requireAuth(context);
    const isAdmin = role === Role.ADMIN;

    const existing = await this.postRepo.findById(id);
    if (!existing) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    if (userId !== existing.author_id && !isAdmin) {
      throw new GraphQLError('Not authorized to edit this post', { extensions: { code: 'FORBIDDEN' } });
    }

    const data: any = {};
    if (input.content !== undefined) data.content = this.sanitizeHtml(input.content);
    if (input.visibility !== undefined) data.visibility = input.visibility;

    const updated = await this.postRepo.update(id, data);
    if (!updated) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    // Refetch full post data
    return (await this.post(id, context))!;
  }

  @Mutation(() => Boolean)
  async deletePost(
    @Arg('id', () => String) id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId, role } = await this.requireAuth(context);
    const isAdmin = role === Role.ADMIN;

    const existing = await this.postRepo.findById(id);
    if (!existing) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    if (userId !== existing.author_id && !isAdmin) {
      throw new GraphQLError('Not authorized to delete this post', { extensions: { code: 'FORBIDDEN' } });
    }

    return this.postRepo.softDelete(id);
  }

  @Mutation(() => PostGQL)
  async hidePost(
    @Arg('id', () => String) id: string,
    @Ctx() context: Context
  ): Promise<PostGQL> {
    const { userId, role } = await this.requireAuth(context);
    if (role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }

    const row = await this.postRepo.hide(id, userId);
    if (!row) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return (await this.post(id, context))!;
  }

  @Mutation(() => PostGQL)
  async unhidePost(
    @Arg('id', () => String) id: string,
    @Ctx() context: Context
  ): Promise<PostGQL> {
    const { role } = await this.requireAuth(context);
    if (role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }

    const row = await this.postRepo.unhide(id);
    if (!row) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return (await this.post(id, context))!;
  }

  @Mutation(() => CommentGQL)
  async addComment(
    @Arg('postId', () => String) postId: string,
    @Arg('content') content: string,
    @Ctx() context: Context
  ): Promise<CommentGQL> {
    const { userId } = await this.requireAuth(context);

    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const row = await this.postRepo.createComment(postId, userId, content);
    return this.mapComment(row);
  }

  @Mutation(() => Boolean)
  async toggleReaction(
    @Arg('postId', () => String) postId: string,
    @Arg('reactionType') reactionType: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const { userId } = await this.requireAuth(context);

    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return this.postRepo.toggleReaction(postId, userId, reactionType);
  }
}
