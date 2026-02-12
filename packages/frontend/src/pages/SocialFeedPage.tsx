import { useState } from 'react';
import { mockPosts, mockCurrentUser } from '../data/mockData';
import { ReactionType } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function SocialFeedPage() {
  const [posts, setPosts] = useState(mockPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost = {
      id: String(Date.now()),
      author: mockCurrentUser,
      content: newPostContent,
      visibility: 'MEMBER_ONLY' as const,
      comments: [],
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  const handleAddComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [
              ...post.comments,
              {
                id: String(Date.now()),
                postId,
                author: mockCurrentUser,
                content,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          };
        }
        return post;
      })
    );

    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  const handleReaction = (postId: string, type: ReactionType) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          const existingReaction = post.reactions.find((r) => r.reactionType === type);
          if (existingReaction) {
            return {
              ...post,
              reactions: post.reactions.map((r) =>
                r.reactionType === type ? { ...r, count: r.count + 1 } : r
              ),
            };
          } else {
            return {
              ...post,
              reactions: [...post.reactions, { reactionType: type, count: 1 }],
            };
          }
        }
        return post;
      })
    );
  };

  const getReactionEmoji = (type: ReactionType) => {
    switch (type) {
      case ReactionType.LIKE:
        return '👍';
      case ReactionType.HEART:
        return '❤️';
      case ReactionType.CELEBRATE:
        return '🎉';
      case ReactionType.SUPPORT:
        return '💪';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Social Feed</h1>

      {/* Create Post */}
      <div className="card mb-6">
        <form onSubmit={handleCreatePost}>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                {mockCurrentUser.firstName[0]}
                {mockCurrentUser.lastName[0]}
              </div>
            </div>
            <div className="flex-1">
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Share something with the club..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <button type="submit" className="btn-primary">
                  Post
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="card">
            {/* Post Header */}
            <div className="flex items-center mb-4">
              <img
                src={post.author.profileImageUrl}
                alt={post.author.firstName}
                className="w-12 h-12 rounded-full mr-3"
              />
              <div>
                <p className="font-semibold text-gray-900">
                  {post.author.firstName} {post.author.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Post Content */}
            <p className="text-gray-800 mb-4">{post.content}</p>

            {/* Reactions */}
            <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
              {Object.values(ReactionType).map((type) => {
                const reaction = post.reactions.find((r) => r.reactionType === type);
                return (
                  <button
                    key={type}
                    onClick={() => handleReaction(post.id, type)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                      reaction && reaction.count > 0
                        ? 'bg-primary-100 text-primary-700'
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
                  <img
                    src={comment.author.profileImageUrl}
                    alt={comment.author.firstName}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {comment.author.firstName} {comment.author.lastName}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}

              {/* Add Comment */}
              <div className="flex items-start space-x-3 mt-3">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {mockCurrentUser.firstName[0]}
                  {mockCurrentUser.lastName[0]}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
