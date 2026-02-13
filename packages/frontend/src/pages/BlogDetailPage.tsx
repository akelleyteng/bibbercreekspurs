import { format } from 'date-fns';
import { useParams, Link } from 'react-router-dom';

import { mockBlogPosts } from '../data/mockData';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const post = mockBlogPosts.find((p) => p.slug === slug);

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
        ← Back to Blog
      </Link>
      
      <article>
        <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-8">
          <img
            src={post.featuredImageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        <div className="flex items-center mb-8 pb-8 border-b">
          <img
            src={post.author.profileImageUrl}
            alt={post.author.firstName}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <p className="font-semibold text-gray-900">
              {post.author.firstName} {post.author.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {format(post.publishedAt!, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-6">{post.excerpt}</p>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      </article>
    </div>
  );
}
