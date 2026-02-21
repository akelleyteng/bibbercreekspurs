import { ReactionType } from '@4hclub/shared';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

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

interface PostMedia {
  id: string;
  mediaType: string;
  publicUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
}

interface PendingMedia {
  id: string;
  file: File;
  preview: string;
  mediaType: string;
  uploading: boolean;
  error?: string;
}

interface Post {
  id: string;
  author: PostAuthor;
  content: string;
  visibility: string;
  isHidden: boolean;
  hiddenAt?: string;
  media: PostMedia[];
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
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
  const apiBaseUrl = graphqlUrl.replace('/graphql', '');

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
              media { id mediaType publicUrl originalFilename mimeType fileSize sortOrder }
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

  // Scroll to a specific post when navigating from dashboard (e.g., /feed#post-123)
  const location = useLocation();
  useEffect(() => {
    if (!loading && location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary-400');
        const timer = setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, location.hash]);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (pendingMedia.length + files.length > 4) {
      alert('Maximum 4 media items per post');
      return;
    }

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${file.name} is too large (max ${isVideo ? '50' : '10'} MB)`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const mediaType = isImage ? 'image' : 'video';

      setPendingMedia(prev => [...prev, { id: tempId, file, preview, mediaType, uploading: true }]);

      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${apiBaseUrl}/api/upload/media`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Upload failed');
        }

        const { media } = await res.json();
        setPendingMedia(prev =>
          prev.map(m => m.id === tempId ? { ...m, id: media.id, uploading: false } : m)
        );
      } catch (error: any) {
        setPendingMedia(prev =>
          prev.map(m => m.id === tempId ? { ...m, uploading: false, error: error.message } : m)
        );
      }
    }

    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const removeMedia = (id: string) => {
    setPendingMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(m => m.id !== id);
    });
  };

  const handleCreatePost = async () => {
    const stripped = newPostContent.replace(/<[^>]*>/g, '').trim();
    if (!stripped && pendingMedia.length === 0) return;
    if (stripped.length > 500) {
      alert('Post is too long. Please keep it under 500 characters.');
      return;
    }

    if (pendingMedia.some(m => m.uploading)) {
      alert('Please wait for media to finish uploading');
      return;
    }

    const validMedia = pendingMedia.filter(m => !m.error && !m.id.startsWith('temp-'));
    const mediaIds = validMedia.map(m => m.id);

    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query: `mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) { id }
        }`,
        variables: {
          input: {
            content: newPostContent || '',
            visibility: 'MEMBER_ONLY',
            ...(mediaIds.length > 0 ? { mediaIds } : {}),
          },
        },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      alert(`Error: ${result.errors[0]?.message || 'Unknown error'}`);
      return;
    }
    pendingMedia.forEach(m => URL.revokeObjectURL(m.preview));
    setPendingMedia([]);
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

              {/* Media file input (hidden) */}
              <input
                ref={mediaInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                multiple
                onChange={handleMediaSelect}
              />

              {/* Media preview grid */}
              {pendingMedia.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {pendingMedia.map((item) => (
                    <div key={item.id} className="relative rounded-lg overflow-hidden bg-gray-100">
                      {item.mediaType === 'image' ? (
                        <img src={item.preview} alt="" className="w-full h-32 object-cover" />
                      ) : (
                        <video src={item.preview} className="w-full h-32 object-cover" />
                      )}
                      {item.uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                        </div>
                      )}
                      {item.error && (
                        <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                          <span className="text-white text-xs px-2 text-center">{item.error}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(item.id)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex justify-between items-center">
                <button
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={pendingMedia.length >= 4}
                  className="text-sm text-gray-500 hover:text-primary-600 disabled:opacity-40 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Photo/Video {pendingMedia.length > 0 ? `(${pendingMedia.length}/4)` : ''}
                </button>
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
              id={`post-${post.id}`}
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

              {/* Media Gallery */}
              {post.media && post.media.length > 0 && (
                <div className={`mb-4 grid gap-2 ${
                  post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}>
                  {post.media.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`rounded-lg overflow-hidden bg-gray-100 ${
                        post.media.length === 3 && idx === 0 ? 'col-span-2' : ''
                      }`}
                    >
                      {item.mediaType === 'image' ? (
                        <img
                          src={item.publicUrl}
                          alt={item.originalFilename}
                          className="w-full h-auto max-h-96 object-cover cursor-pointer"
                          loading="lazy"
                          onClick={() => window.open(item.publicUrl, '_blank')}
                        />
                      ) : (
                        <video
                          src={item.publicUrl}
                          controls
                          preload="metadata"
                          className="w-full max-h-96"
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                    </div>
                  ))}
                </div>
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
