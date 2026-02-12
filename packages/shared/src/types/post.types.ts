import { ReactionType, Visibility } from '../enums/visibility.enum';

export interface Post {
  id: string;
  authorId: string;
  content: string;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Reaction {
  id: string;
  postId?: string;
  commentId?: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: Date;
}

export interface PostWithDetails extends Post {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  comments: CommentWithAuthor[];
  reactions: ReactionSummary[];
  userReaction?: ReactionType;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  reactions: ReactionSummary[];
  userReaction?: ReactionType;
}

export interface ReactionSummary {
  reactionType: ReactionType;
  count: number;
}

export interface CreatePostRequest {
  content: string;
  visibility?: Visibility;
}

export interface UpdatePostRequest {
  content?: string;
  visibility?: Visibility;
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface AddReactionRequest {
  reactionType: ReactionType;
}
