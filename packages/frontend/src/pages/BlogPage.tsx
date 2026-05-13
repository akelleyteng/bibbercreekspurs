import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import BlogGuidelinesModal from '../components/BlogGuidelinesModal';
import BlogPostModal from '../components/BlogPostModal';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  visibility: string;
  publishedAt?: string;
  approvalStatus: string;
  rejectionReason?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface BlogGuidelines {
  id: string;
  content: string;
  updatedAt: string;
}

const POSTS_QUERY = `
  query {
    blogPosts {
      id title slug content excerpt featuredImageUrl visibility publishedAt approvalStatus rejectionReason
      author { id firstName lastName }
    }
  }
`;

const PENDING_QUERY = `
  query {
    pendingBlogPosts {
      id title slug excerpt visibility approvalStatus
      author { id firstName lastName }
    }
  }
`;

const GUIDELINES_QUERY = `
  query {
    blogGuidelines { id content updatedAt }
  }
`;

export default function BlogPage() {
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [pendingPosts, setPendingPosts] = useState<BlogPostData[]>([]);
  const [guidelines, setGuidelines] = useState<BlogGuidelines | null>(null);
  const [loading, setLoading] = useState(true);

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostData | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isLeader = user?.role === 'ADULT_LEADER';
  const isParent = user?.role === 'PARENT';
  const isPrivileged = isAdmin || isLeader;
  const canApprove = isPrivileged || isParent;

  const loadPosts = useCallback(async () => {
    const result = await authFetch(POSTS_QUERY);
    if (result.data?.blogPosts) {
      setPosts(result.data.blogPosts);
    }
  }, []);

  const loadPending = useCallback(async () => {
    if (!canApprove) return;
    const result = await authFetch(PENDING_QUERY);
    if (result.data?.pendingBlogPosts) {
      setPendingPosts(result.data.pendingBlogPosts);
    }
  }, [canApprove]);

  const loadGuidelines = useCallback(async () => {
    const result = await authFetch(GUIDELINES_QUERY);
    if (result.data?.blogGuidelines) {
      setGuidelines(result.data.blogGuidelines);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      loadPosts(),
      loadPending(),
      loadGuidelines(),
    ]).finally(() => setLoading(false));
  }, [isAuthenticated, loadPosts, loadPending, loadGuidelines]);

  const handleCreatePost = async (data: any) => {
    const result = await authFetch(
      `mutation CreateBlogPost($input: CreateBlogPostInput!) {
        createBlogPost(input: $input) {
          id title slug approvalStatus
        }
      }`,
      {
        input: {
          title: data.title,
          content: data.content,
          excerpt: data.excerpt || undefined,
          visibility: data.visibility,
          featuredImageUrl: data.featuredImageUrl || undefined,
          publishedAt: data.publishedAt || undefined,
          guidelinesAgreed: data.guidelinesAgreed,
        },
      }
    );
    if (!result.errors) {
      await loadPosts();
    }
  };

  const handleEditPost = async (data: any) => {
    if (!editingPost) return;
    const content = (data.content || '').trim();
    if (!content || content === '<p></p>') {
      alert('Post content cannot be empty.');
      return;
    }
    await authFetch(
      `mutation UpdateBlogPost($id: String!, $input: UpdateBlogPostInput!) {
        updateBlogPost(id: $id, input: $input) {
          id title slug approvalStatus
        }
      }`,
      {
        id: editingPost.id,
        input: {
          title: data.title,
          content: data.content,
          excerpt: data.excerpt || undefined,
          visibility: data.visibility,
          featuredImageUrl: data.featuredImageUrl || undefined,
          publishedAt: data.publishedAt || undefined,
        },
      }
    );
    await loadPosts();
    setEditingPost(null);
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    await authFetch(`mutation { deleteBlogPost(id: "${id}") }`);
    await loadPosts();
  };

  const handleApprove = async (id: string) => {
    setActionError(null);
    const result = await authFetch(
      `mutation ApproveBlogPost($id: String!) {
        approveBlogPost(id: $id) { id approvalStatus }
      }`,
      { id }
    );
    if (result.errors) {
      setActionError(result.errors[0]?.message || 'Failed to approve post');
    } else {
      await Promise.all([loadPosts(), loadPending()]);
    }
  };

  const handleReject = async (id: string) => {
    setActionError(null);
    const result = await authFetch(
      `mutation RejectBlogPost($id: String!, $reason: String) {
        rejectBlogPost(id: $id, reason: $reason) { id approvalStatus }
      }`,
      { id, reason: rejectReason || undefined }
    );
    if (result.errors) {
      setActionError(result.errors[0]?.message || 'Failed to reject post');
    } else {
      setRejectingId(null);
      setRejectReason('');
      await Promise.all([loadPosts(), loadPending()]);
    }
  };

  const handleSaveGuidelines = async (content: string) => {
    const result = await authFetch(
      `mutation UpdateBlogGuidelines($input: UpdateBlogGuidelinesInput!) {
        updateBlogGuidelines(input: $input) { id content updatedAt }
      }`,
      { input: { content } }
    );
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Failed to save');
    }
    if (result.data?.updateBlogGuidelines) {
      setGuidelines(result.data.updateBlogGuidelines);
    }
  };

  // Posts visible in the main grid
  const visiblePosts = posts.filter(
    (p) => p.approvalStatus === 'APPROVED' || isPrivileged
  );

  // Member's own non-approved posts shown in a separate section
  const myDraftPosts = isAuthenticated && !isPrivileged
    ? posts.filter((p) => p.author.id === user?.id && p.approvalStatus !== 'APPROVED')
    : [];

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Club Blog</h1>
        <p className="text-gray-500 text-center py-12">Loading posts...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Club Blog</h1>
        {isAuthenticated && (
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            Write a Post
          </button>
        )}
      </div>

      {/* Guidelines Banner */}
      <div className="mb-6 flex items-start gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>
          Before submitting a post, please read our{' '}
          <button
            onClick={() => setGuidelinesOpen(true)}
            className="font-semibold underline hover:text-blue-800"
          >
            Blog Posting Guidelines
          </button>.
          {isAdmin && (
            <button
              onClick={() => setGuidelinesOpen(true)}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
            >
              Edit guidelines
            </button>
          )}
        </span>
      </div>

      {/* Approval Panel — admins, leaders, and parents */}
      {canApprove && pendingPosts.length > 0 && (
        <div className="mb-8 border border-amber-200 rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
            <h2 className="font-semibold text-amber-900">
              Posts Awaiting Approval ({pendingPosts.length})
            </h2>
          </div>
          {actionError && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-200">
              {actionError}
            </div>
          )}
          <ul className="divide-y divide-amber-100">
            {pendingPosts.map((post) => (
              <li key={post.id} className="p-4">
                <div className="flex flex-wrap gap-3 items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{post.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      by {post.author.firstName} {post.author.lastName}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={() => handleApprove(post.id)}
                      className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    {rejectingId === post.id ? (
                      <div className="flex gap-2 items-center flex-wrap">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="input text-sm py-1 px-2 w-48"
                        />
                        <button
                          onClick={() => handleReject(post.id)}
                          className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="text-sm px-3 py-1.5 text-gray-600 border rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setRejectingId(post.id); setRejectReason(''); }}
                        className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Member's own pending/rejected posts */}
      {myDraftPosts.length > 0 && (
        <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">My Submitted Posts</h2>
          </div>
          <ul className="divide-y">
            {myDraftPosts.map((post) => (
              <li key={post.id} className="p-4 flex flex-wrap gap-3 items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{post.title}</span>
                    {post.approvalStatus === 'PENDING' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                        Pending Review
                      </span>
                    )}
                    {post.approvalStatus === 'REJECTED' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        Not Approved
                      </span>
                    )}
                  </div>
                  {post.approvalStatus === 'REJECTED' && post.rejectionReason && (
                    <p className="text-sm text-red-600 mt-1">
                      Feedback: {post.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingPost(post)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Published Posts Grid */}
      {visiblePosts.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No blog posts yet. Check back soon!</p>
      ) : (
        <div className="grid gap-4 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map((post) => (
            <div key={post.id} className="group relative">
              <Link to={`/blog/${post.slug}`} className="block">
                {post.featuredImageUrl && (
                  <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
                    <img
                      src={post.featuredImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isPrivileged && post.approvalStatus === 'PENDING' && (
                      <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                        Pending
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center flex-wrap gap-1.5 text-sm text-gray-500 mb-2">
                  <span>{post.author.firstName} {post.author.lastName}</span>
                  {post.publishedAt && (
                    <>
                      <span>&bull;</span>
                      <span>{format(new Date(post.publishedAt), 'MMM d, yyyy')}</span>
                    </>
                  )}
                  {isPrivileged && post.approvalStatus === 'PENDING' && !post.featuredImageUrl && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                      Pending
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-gray-600">
                    {DOMPurify.sanitize(post.excerpt, { ALLOWED_TAGS: [] }).replace(/&nbsp;/g, ' ')}
                  </p>
                )}
              </Link>
              {isPrivileged && (
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    onClick={() => setEditingPost(post)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <BlogGuidelinesModal
        isOpen={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        content={guidelines?.content || ''}
        isAdmin={isAdmin}
        onSave={isAdmin ? handleSaveGuidelines : undefined}
      />

      <BlogPostModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreatePost}
        mode="create"
        isPrivileged={isPrivileged}
        onViewGuidelines={() => { setCreateOpen(false); setGuidelinesOpen(true); }}
      />

      {editingPost && (
        <BlogPostModal
          isOpen={!!editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleEditPost}
          initialData={{
            title: editingPost.title,
            content: editingPost.content,
            excerpt: editingPost.excerpt,
            visibility: editingPost.visibility as any,
            featuredImageUrl: editingPost.featuredImageUrl,
            publishedAt: editingPost.publishedAt
              ? new Date(editingPost.publishedAt).toISOString().slice(0, 16)
              : '',
          }}
          mode="edit"
          isPrivileged={isPrivileged}
        />
      )}
    </div>
  );
}
