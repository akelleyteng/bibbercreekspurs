import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  visibility: string;
  publishedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const token = localStorage.getItem('token');
    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { blogPost(slug: "${slug}") { id title slug content excerpt featuredImageUrl visibility publishedAt author { id firstName lastName profileImageUrl } } }`,
      }),
    })
      .then((res) => res.json())
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

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/blog" className="text-primary-600 hover:text-primary-700 mb-6 inline-block">
        &larr; Back to Blog
      </Link>

      <article>
        {post.featuredImageUrl && (
          <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-8">
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>

        <div className="flex items-center mb-8 pb-8 border-b">
          {post.author.profileImageUrl && (
            <img
              src={post.author.profileImageUrl}
              alt={post.author.firstName}
              className="w-12 h-12 rounded-full mr-4"
            />
          )}
          <div>
            <p className="font-semibold text-gray-900">
              {post.author.firstName} {post.author.lastName}
            </p>
            {post.publishedAt && (
              <p className="text-sm text-gray-500">
                {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          {post.excerpt && (
            <p className="text-xl text-gray-700 leading-relaxed mb-6">{post.excerpt}</p>
          )}
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      </article>
    </div>
  );
}
