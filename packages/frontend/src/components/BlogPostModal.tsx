import { Visibility } from '@4hclub/shared';
import { useState, useEffect, useRef } from 'react';

import RichTextEditor from './RichTextEditor';

const apiBaseUrl = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace('/graphql', '');

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large (max 10 MB)');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${apiBaseUrl}/api/upload/blog-image`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.error || 'Upload failed');
        return;
      }

      const result = await res.json();
      setFormData(prev => ({ ...prev, featuredImageUrl: result.url }));
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
                <RichTextEditor
                  key={`${isOpen}-${mode}`}
                  content={formData.content}
                  onChange={(html) => handleChange('content', html)}
                  placeholder="Write your blog post content here..."
                  showHeadings
                  showImageEmbed
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
                <div className="mb-3 relative">
                  <img
                    src={formData.featuredImageUrl}
                    alt="Featured preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('featuredImageUrl', '')}
                    className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-600 rounded-full p-1.5 shadow"
                    title="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-600 mb-2">{uploadError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-primary text-sm"
                >
                  {uploading ? 'Uploading...' : formData.featuredImageUrl ? 'Replace Image' : 'Upload Image'}
                </button>
                {!showUrlInput && (
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(true)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    or paste URL
                  </button>
                )}
              </div>
              {showUrlInput && (
                <div className="mt-2">
                  <input
                    type="url"
                    className="input text-sm"
                    value={formData.featuredImageUrl}
                    onChange={(e) => handleChange('featuredImageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
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
