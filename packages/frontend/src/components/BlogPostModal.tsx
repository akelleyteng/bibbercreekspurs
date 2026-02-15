import { Visibility } from '@4hclub/shared';
import { useState, useEffect } from 'react';

interface BlogPostFormData {
  title: string;
  content: string;
  excerpt: string;
  visibility: Visibility;
  featuredImageUrl: string;
  publishedAt: string;
}

interface BlogPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BlogPostFormData) => void;
  initialData?: Partial<BlogPostFormData>;
  mode: 'create' | 'edit';
}

export default function BlogPostModal({ isOpen, onClose, onSave, initialData, mode }: BlogPostModalProps) {
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: initialData?.title || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    visibility: initialData?.visibility || Visibility.PUBLIC,
    featuredImageUrl: initialData?.featuredImageUrl || '',
    publishedAt: initialData?.publishedAt || '',
  });

  useEffect(() => {
    setFormData({
      title: initialData?.title || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      visibility: initialData?.visibility || Visibility.PUBLIC,
      featuredImageUrl: initialData?.featuredImageUrl || '',
      publishedAt: initialData?.publishedAt || '',
    });
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof BlogPostFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blog-post-modal-title"
    >
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="blog-post-modal-title" className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Create New Post' : 'Edit Post'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="My Blog Post Title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  required
                  className="input"
                  rows={10}
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Write your blog post content here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.excerpt}
                  onChange={(e) => handleChange('excerpt', e.target.value)}
                  placeholder="A short summary of the post..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to auto-generate from content
                </p>
              </div>
            </div>

            {/* Featured Image */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image (Optional)
              </label>
              {formData.featuredImageUrl && (
                <div className="mb-3">
                  <img
                    src={formData.featuredImageUrl}
                    alt="Featured preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
              <input
                type="url"
                className="input"
                value={formData.featuredImageUrl}
                onChange={(e) => handleChange('featuredImageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Visibility & Publishing */}
            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value={Visibility.PUBLIC}
                      checked={formData.visibility === Visibility.PUBLIC}
                      onChange={(e) => handleChange('visibility', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value={Visibility.MEMBER_ONLY}
                      checked={formData.visibility === Visibility.MEMBER_ONLY}
                      onChange={(e) => handleChange('visibility', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Members Only</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publish Date
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.publishedAt}
                  onChange={(e) => handleChange('publishedAt', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to save as draft
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {mode === 'create' ? 'Create Post' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
