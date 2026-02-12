import { useState } from 'react';

interface SponsorFormData {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  description: string;
}

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SponsorFormData) => void;
  initialData?: Partial<SponsorFormData>;
  mode: 'create' | 'edit';
}

export default function SponsorModal({ isOpen, onClose, onSave, initialData, mode }: SponsorModalProps) {
  const [formData, setFormData] = useState<SponsorFormData>({
    name: initialData?.name || '',
    logoUrl: initialData?.logoUrl || '',
    websiteUrl: initialData?.websiteUrl || '',
    description: initialData?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof SponsorFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
    >
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="sponsor-modal-title" className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Add New Sponsor' : 'Edit Sponsor'}
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
                  Sponsor Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Local Farm Supply"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL *
                </label>
                <input
                  type="url"
                  required
                  className="input"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload your logo to an image hosting service and paste the URL here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL *
                </label>
                <input
                  type="url"
                  required
                  className="input"
                  value={formData.websiteUrl}
                  onChange={(e) => handleChange('websiteUrl', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Supporting youth agriculture since 1985"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {mode === 'create' ? 'Add Sponsor' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
