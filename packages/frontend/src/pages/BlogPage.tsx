import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
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

export default function BlogPage() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { blogPosts(publicOnly: ${!isLoggedIn}) { id title slug excerpt featuredImageUrl visibility publishedAt author { id firstName lastName profileImageUrl } } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.blogPosts) {
          setPosts(result.data.blogPosts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Blog</h1>
        <p className="text-gray-500 text-center py-12">Loading posts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Club Blog</h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No blog posts yet. Check back soon!</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group">
              {post.featuredImageUrl && (
                <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
                  <img
                    src={post.featuredImageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <span>{post.author.firstName} {post.author.lastName}</span>
                {post.publishedAt && (
                  <>
                    <span className="mx-2">&bull;</span>
                    <span>{format(new Date(post.publishedAt), 'MMM d, yyyy')}</span>
                  </>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                {post.title}
              </h3>
              {post.excerpt && <p className="text-gray-600">{DOMPurify.sanitize(post.excerpt, { ALLOWED_TAGS: [] }).replace(/&nbsp;/g, ' ')}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
