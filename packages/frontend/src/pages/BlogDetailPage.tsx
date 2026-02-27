import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import MemberAvatar from '../components/MemberAvatar';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

interface BlogPostDetail {
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
    role?: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  YOUTH_MEMBER: '4-H Member',
  ADULT_LEADER: 'Adult Leader',
  PARENT: 'Parent/Guardian',
  ADMIN: 'Club Admin',
};

export default function BlogDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    authFetch(
      `query BlogPost($slug: String!) {
        blogPost(slug: $slug) {
          id title slug content excerpt featuredImageUrl visibility publishedAt
          approvalStatus rejectionReason
          author { id firstName lastName role }
        }
      }`,
      { slug }
    )
      .then((result) => {
        if (result.data?.blogPost) {
          setPost(result.data.blogPost);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link to="/blog" className="text-primary-600 hover:text-primary-700 mb-6 inline-block">
          &larr; Back to Blog
        </Link>
        <p className="text-gray-500 text-center py-12">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h2>
        <Link to="/blog" className="btn-primary">Back to Blog</Link>
      </div>
    );
  }

  const isAuthor = user?.id === post.author.id;
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'ADULT_LEADER';
  const showStatusBanner = post.approvalStatus !== 'APPROVED' && (isAuthor || isPrivileged);

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/blog" className="text-primary-600 hover:text-primary-700 mb-6 inline-block">
        &larr; Back to Blog
      </Link>

      {/* Status Banners */}
      {showStatusBanner && post.approvalStatus === 'PENDING' && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800">Awaiting Approval</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              This post is pending review by a club leader before it will appear on the blog.
            </p>
          </div>
        </div>
      )}

      {showStatusBanner && post.approvalStatus === 'REJECTED' && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-red-800">Post Not Approved</p>
            {post.rejectionReason ? (
              <p className="text-sm text-red-700 mt-0.5">Feedback: {post.rejectionReason}</p>
            ) : (
              <p className="text-sm text-red-700 mt-0.5">
                This post was not approved. You can edit it and resubmit from the blog page.
              </p>
            )}
          </div>
        </div>
      )}

      <article>
        {post.featuredImageUrl && (
          <div className="relative h-48 sm:h-96 bg-gray-200 rounded-lg overflow-hidden mb-4 sm:mb-8">
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Visibility badge */}
        <div className="mb-3">
          {post.visibility === 'PUBLIC' ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              Members Only
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">{post.title}</h1>

        <div className="flex items-center mb-4 sm:mb-8 pb-4 sm:pb-8 border-b">
          <MemberAvatar
            userId={post.author.id}
            firstName={post.author.firstName}
            lastName={post.author.lastName}
            size="lg"
            className="mr-4"
          />
          <div>
            <p className="font-semibold text-gray-900">
              {post.author.firstName} {post.author.lastName}
            </p>
            {post.author.role && ROLE_LABELS[post.author.role] && (
              <p className="text-xs text-primary-600 font-medium">
                {ROLE_LABELS[post.author.role]}
              </p>
            )}
            {post.publishedAt && (
              <p className="text-sm text-gray-500">
                {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
        />
      </article>
    </div>
  );
}
