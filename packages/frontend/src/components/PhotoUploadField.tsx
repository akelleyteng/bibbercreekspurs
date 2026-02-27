import { useState } from 'react';
import ImageCropModal from './ImageCropModal';

const apiBaseUrl = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace('/graphql', '');

interface PhotoUploadFieldProps {
  type: 'profile' | 'horse';
  photoUrl?: string;
  label: string;
  onUploaded: (url: string) => void;
  targetUserId?: string;
  onMessage?: (text: string, type: 'success' | 'error') => void;
  compact?: boolean;
}

export default function PhotoUploadField({
  type,
  photoUrl,
  label,
  onUploaded,
  targetUserId,
  onMessage,
  compact,
}: PhotoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);

  const labelClass = compact
    ? 'block text-xs font-medium text-gray-600 mb-1'
    : 'block text-sm font-medium text-gray-700 mb-1';

  const openCrop = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onMessage?.('Only image files are allowed', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onMessage?.('File too large (max 10 MB)', 'error');
      return;
    }
    setCropImage(URL.createObjectURL(file));
  };

  const closeCrop = () => {
    if (cropImage) URL.revokeObjectURL(cropImage);
    setCropImage(null);
  };

  const handleCropConfirm = (croppedFile: File) => {
    closeCrop();
    upload(croppedFile);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (targetUserId) formData.append('userId', targetUserId);

      const token = localStorage.getItem('token');
      const endpoint = type === 'profile' ? 'profile-photo' : 'horse-photo';
      const res = await fetch(`${apiBaseUrl}/api/upload/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        onMessage?.(err.error || 'Upload failed', 'error');
        return;
      }

      const result = await res.json();
      onUploaded(result.url);
      onMessage?.(`${label} uploaded!`, 'success');
    } catch {
      onMessage?.('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className={`${labelClass} mb-2`}>{label}</label>
      <div className="flex items-center gap-3">
        {photoUrl ? (
          <img src={photoUrl} alt={label} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No photo</div>
        )}
        <label className={`${compact ? 'btn-secondary text-sm' : 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50'} cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) openCrop(file);
              e.target.value = '';
            }}
            disabled={uploading}
          />
        </label>
      </div>
      {cropImage && (
        <ImageCropModal
          imageSrc={cropImage}
          onConfirm={handleCropConfirm}
          onCancel={closeCrop}
        />
      )}
    </div>
  );
}
