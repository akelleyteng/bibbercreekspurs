import db from '../models/database';
import { logger } from '../utils/logger';

export interface PostRow {
  id: string;
  author_id: string;
  content: string;
  visibility: string;
  is_hidden: boolean;
  hidden_by: string | null;
  hidden_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  // Joined fields
  author_first_name: string;
  author_last_name: string;
  author_profile_photo_url: string | null;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  author_first_name: string;
  author_last_name: string;
  author_profile_photo_url: string | null;
}

export interface ReactionRow {
  post_id: string;
  reaction_type: string;
  count: string; // pg returns bigint as string
}

export interface UserReactionRow {
  post_id: string;
  reaction_type: string;
}

export interface CreatePostData {
  author_id: string;
  content: string;
  visibility: string;
}

export interface UpdatePostData {
  content?: string;
  visibility?: string;
}

const BASE_POST_SELECT = `
  SELECT p.id, p.author_id, p.content, p.visibility,
         p.is_hidden, p.hidden_by, p.hidden_at,
         p.created_at, p.updated_at,
         u.first_name AS author_first_name,
         u.last_name AS author_last_name,
         u.profile_photo_url AS author_profile_photo_url
  FROM posts p
  JOIN users u ON u.id = p.author_id
  WHERE p.deleted_at IS NULL`;

const BASE_COMMENT_SELECT = `
  SELECT c.id, c.post_id, c.author_id, c.content,
         c.created_at, c.updated_at,
         u.first_name AS author_first_name,
         u.last_name AS author_last_name,
         u.profile_photo_url AS author_profile_photo_url
  FROM comments c
  JOIN users u ON u.id = c.author_id
  WHERE c.deleted_at IS NULL`;

export class PostRepository {
  async findAll(includeHidden: boolean): Promise<PostRow[]> {
    const hiddenFilter = includeHidden ? '' : ' AND p.is_hidden = false';
    const result = await db.query<PostRow>(
      `${BASE_POST_SELECT}${hiddenFilter}
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  }

  async findById(id: string): Promise<PostRow | null> {
    const result = await db.query<PostRow>(
      `${BASE_POST_SELECT} AND p.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreatePostData): Promise<PostRow> {
    const result = await db.query<{ id: string }>(
      `INSERT INTO posts (author_id, content, visibility)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [data.author_id, data.content, data.visibility]
    );
    logger.info(`Post created: ${result.rows[0].id}`);
    return (await this.findById(result.rows[0].id))!;
  }

  async update(id: string, data: UpdatePostData): Promise<PostRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdatePostData)[] = ['content', 'visibility'];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.query(
      `UPDATE posts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL`,
      values
    );

    logger.info(`Post updated: ${id}`);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info(`Post soft-deleted: ${id}`);
    }
    return deleted;
  }

  async hide(id: string, hiddenBy: string): Promise<PostRow | null> {
    await db.query(
      `UPDATE posts
       SET is_hidden = true, hidden_by = $1, hidden_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL`,
      [hiddenBy, id]
    );
    logger.info(`Post hidden: ${id} by ${hiddenBy}`);
    return this.findById(id);
  }

  async unhide(id: string): Promise<PostRow | null> {
    await db.query(
      `UPDATE posts
       SET is_hidden = false, hidden_by = NULL, hidden_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    logger.info(`Post unhidden: ${id}`);
    return this.findById(id);
  }

  // Comments
  async findCommentsByPostIds(postIds: string[]): Promise<CommentRow[]> {
    if (postIds.length === 0) return [];
    const result = await db.query<CommentRow>(
      `${BASE_COMMENT_SELECT} AND c.post_id = ANY($1)
       ORDER BY c.created_at ASC`,
      [postIds]
    );
    return result.rows;
  }

  async createComment(postId: string, authorId: string, content: string): Promise<CommentRow> {
    const result = await db.query<{ id: string }>(
      `INSERT INTO comments (post_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [postId, authorId, content]
    );
    const commentResult = await db.query<CommentRow>(
      `${BASE_COMMENT_SELECT} AND c.id = $1`,
      [result.rows[0].id]
    );
    logger.info(`Comment created on post ${postId}`);
    return commentResult.rows[0];
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Reactions
  async getReactionSummaries(postIds: string[]): Promise<ReactionRow[]> {
    if (postIds.length === 0) return [];
    const result = await db.query<ReactionRow>(
      `SELECT post_id, reaction_type, COUNT(*) AS count
       FROM reactions
       WHERE post_id = ANY($1)
       GROUP BY post_id, reaction_type`,
      [postIds]
    );
    return result.rows;
  }

  async getUserReactions(postIds: string[], userId: string): Promise<UserReactionRow[]> {
    if (postIds.length === 0) return [];
    const result = await db.query<UserReactionRow>(
      `SELECT post_id, reaction_type
       FROM reactions
       WHERE post_id = ANY($1) AND user_id = $2`,
      [postIds, userId]
    );
    return result.rows;
  }

  async toggleReaction(postId: string, userId: string, reactionType: string): Promise<boolean> {
    // Check if reaction exists
    const existing = await db.query(
      `SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3`,
      [postId, userId, reactionType]
    );

    if (existing.rows.length > 0) {
      // Remove the reaction
      await db.query(
        `DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3`,
        [postId, userId, reactionType]
      );
      return false; // reaction removed
    } else {
      // Remove any existing reaction from this user on this post (one reaction per user per post)
      await db.query(
        `DELETE FROM reactions WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      // Add the new reaction
      await db.query(
        `INSERT INTO reactions (post_id, user_id, reaction_type)
         VALUES ($1, $2, $3)`,
        [postId, userId, reactionType]
      );
      return true; // reaction added
    }
  }
}
