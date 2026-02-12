import { Link } from 'react-router-dom';
import { mockBlogPosts } from '../data/mockData';
import { format } from 'date-fns';

export default function BlogPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Club Blog</h1>
        <button className="btn-primary">✏️ Write Post</button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {mockBlogPosts.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group">
            <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
              <img
                src={post.featuredImageUrl}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <span>{post.author.firstName} {post.author.lastName}</span>
              <span className="mx-2">•</span>
              <span>{format(post.publishedAt!, 'MMM d, yyyy')}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
              {post.title}
            </h3>
            <p className="text-gray-600">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
