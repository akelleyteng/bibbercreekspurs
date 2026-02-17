import { ReactionType } from '@4hclub/shared';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';

import RichTextEditor from '../components/RichTextEditor';
import { useAuth } from '../context/AuthContext';

interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
}

interface ReactionSummary {
  reactionType: string;
  count: number;
}

interface Comment {
  id: string;
  postId: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  author: PostAuthor;
  content: string;
  visibility: string;
  isHidden: boolean;
  hiddenAt?: string;
  comments: Comment[];
  reactions: ReactionSummary[];
  userReaction?: string;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

const getReactionEmoji = (type: string) => {
  switch (type) {
    case ReactionType.LIKE: return '👍';
    case ReactionType.HEART: return '❤️';
    case ReactionType.CELEBRATE: return '🎉';
    case ReactionType.SUPPORT: return '💪';
    default: return '👍';
  }
};

export default function SocialFeedPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `query {
            posts {
              id content visibility isHidden hiddenAt canEdit createdAt updatedAt
              author { id firstName lastName profilePhotoUrl }
              comments { id postId content createdAt author { id firstName lastName profilePhotoUrl } }
              reactions { reactionType count }
              userReaction
            }
          }`,
        }),
      });
      const result = await res.json();
      if (result.data?.posts) {
        setPosts(result.data.posts);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [graphqlUrl, getHeaders]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    // Check if content is empty (tiptap returns <p></p> for empty)
    const stripped = newPostContent.replace(/<[^>]*>/g, '').trim();
    if (!stripped) return;
    if (stripped.length > 500) {
      alert('Post is too long. Please keep it under 500 characters.');
      return;
    }

    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) { id }
        }`,
        variables: { input: { content: newPostContent, visibility: 'MEMBER_ONLY' } },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setNewPostContent('');
    setEditorKey(k => k + 1);
    fetchPosts();
  };

  const handleUpdatePost = async (postId: string) => {
    const stripped = editContent.replace(/<[^>]*>/g, '').trim();
    if (stripped.length > 500) {
      alert('Post is too long. Please keep it under 500 characters.');
      return;
    }
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation UpdatePost($id: String!, $input: UpdatePostInput!) {
          updatePost(id: $id, input: $input) { id }
        }`,
        variables: { id: postId, input: { content: editContent } },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setEditingPostId(null);
    setEditContent('');
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation DeletePost($id: String!) { deletePost(id: $id) }`,
        variables: { id: postId },
      }),
    });
    fetchPosts();
  };

  const handleHidePost = async (postId: string) => {
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation HidePost($id: String!) { hidePost(id: $id) { id } }`,
        variables: { id: postId },
      }),
    });
    fetchPosts();
  };

  const handleUnhidePost = async (postId: string) => {
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation UnhidePost($id: String!) { unhidePost(id: $id) { id } }`,
        variables: { id: postId },
      }),
    });
    fetchPosts();
  };

  const handleToggleReaction = async (postId: string, reactionType: string) => {
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation ToggleReaction($postId: String!, $reactionType: String!) {
          toggleReaction(postId: $postId, reactionType: $reactionType)
        }`,
        variables: { postId, reactionType },
      }),
    });
    fetchPosts();
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation AddComment($postId: String!, $content: String!) {
          addComment(postId: $postId, content: $content) { id }
        }`,
        variables: { postId, content },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    setCommentInputs({ ...commentInputs, [postId]: '' });
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Social Feed</h1>
        <p className="text-gray-500 text-center py-8">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Social Feed</h1>

      {/* Create Post */}
      {user && (
        <div className="card mb-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
            <div className="flex-1">
              <RichTextEditor
                key={editorKey}
                content=""
                onChange={setNewPostContent}
                placeholder="Share something with the club..."
                maxLength={500}
                compact
              />
              <div className="mt-3 flex justify-end">
                <button onClick={handleCreatePost} className="btn-primary">
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No posts yet. Be the first to share something!</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`card ${post.isHidden ? 'opacity-60 border-yellow-300' : ''}`}
            >
              {/* Hidden badge for admins */}
              {post.isHidden && isAdmin && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Hidden from members
                  </span>
                </div>
              )}

              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {post.author.profilePhotoUrl ? (
                    <img
                      src={post.author.profilePhotoUrl}
                      alt={post.author.firstName}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold mr-3">
                      {post.author.firstName[0]}{post.author.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {post.author.firstName} {post.author.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Post Actions */}
                {(post.canEdit || isAdmin) && (
                  <div className="flex items-center gap-2">
                    {post.canEdit && editingPostId !== post.id && (
                      <button
                        onClick={() => {
                          setEditingPostId(post.id);
                          setEditContent(post.content);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Edit
                      </button>
                    )}
                    {post.canEdit && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                    {isAdmin && !post.isHidden && (
                      <button
                        onClick={() => handleHidePost(post.id)}
                        className="text-sm text-yellow-600 hover:text-yellow-700"
                      >
                        Hide
                      </button>
                    )}
                    {isAdmin && post.isHidden && (
                      <button
                        onClick={() => handleUnhidePost(post.id)}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        Unhide
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Post Content */}
              {editingPostId === post.id ? (
                <div className="mb-4">
                  <RichTextEditor
                    content={editContent}
                    onChange={setEditContent}
                    placeholder="Edit your post..."
                    maxLength={500}
                  />
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleUpdatePost(post.id)} className="btn-primary text-sm">
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingPostId(null); setEditContent(''); }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-none text-gray-800 mb-4"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                />
              )}

              {/* Reactions */}
              <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
                {Object.values(ReactionType).map((type) => {
                  const reaction = post.reactions.find((r) => r.reactionType === type);
                  const isUserReaction = post.userReaction === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleToggleReaction(post.id, type)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                        isUserReaction
                          ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                          : reaction && reaction.count > 0
                            ? 'bg-primary-50 text-primary-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{getReactionEmoji(type)}</span>
                      {reaction && reaction.count > 0 && (
                        <span className="font-medium">{reaction.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Comments */}
              <div className="space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    {comment.author.profilePhotoUrl ? (
                      <img
                        src={comment.author.profilePhotoUrl}
                        alt={comment.author.firstName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {comment.author.firstName[0]}{comment.author.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {comment.author.firstName} {comment.author.lastName}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}

                {/* Add Comment */}
                {user && (
                  <div className="flex items-start space-x-3 mt-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex-1 flex space-x-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="btn-primary"
                        disabled={!commentInputs[post.id]?.trim()}
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
