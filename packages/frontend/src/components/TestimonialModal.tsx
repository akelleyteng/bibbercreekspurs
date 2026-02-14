import { useState, useEffect } from 'react';

interface TestimonialFormData {
  authorName: string;
  authorRole: string;
  content: string;
  imageUrl: string;
}

interface TestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TestimonialFormData) => void;
  initialData?: Partial<TestimonialFormData>;
  mode: 'create' | 'edit';
}

export default function TestimonialModal({ isOpen, onClose, onSave, initialData, mode }: TestimonialModalProps) {
  const [formData, setFormData] = useState<TestimonialFormData>({
    authorName: initialData?.authorName || '',
    authorRole: initialData?.authorRole || '',
    content: initialData?.content || '',
    imageUrl: initialData?.imageUrl || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        authorName: initialData?.authorName || '',
        authorRole: initialData?.authorRole || '',
        content: initialData?.content || '',
        imageUrl: initialData?.imageUrl || '',
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof TestimonialFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="testimonial-modal-title"
    >
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="testimonial-modal-title" className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Add New Testimonial' : 'Edit Testimonial'}
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
                  Author Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.authorName}
                  onChange={(e) => handleChange('authorName', e.target.value)}
                  placeholder="Jennifer Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author Role *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.authorRole}
                  onChange={(e) => handleChange('authorRole', e.target.value)}
                  placeholder="Parent, Alumni Member, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testimonial Content *
                </label>
                <textarea
                  required
                  className="input"
                  rows={5}
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Share your experience with the 4-H club..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author Photo URL
                </label>
                <input
                  type="url"
                  className="input"
                  value={formData.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://example.com/photo.jpg (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - Leave blank to use auto-generated avatar
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {mode === 'create' ? 'Add Testimonial' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
