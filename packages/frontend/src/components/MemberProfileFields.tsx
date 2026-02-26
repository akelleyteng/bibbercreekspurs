import { useState } from 'react';

const apiBaseUrl = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace('/graphql', '');

const TSHIRT_OPTIONS = [
  { value: '', label: '-- Select size --' },
  { value: 'YS', label: 'Youth Small' },
  { value: 'YM', label: 'Youth Medium' },
  { value: 'YL', label: 'Youth Large' },
  { value: 'AS', label: 'Adult Small' },
  { value: 'AM', label: 'Adult Medium' },
  { value: 'AL', label: 'Adult Large' },
  { value: 'AXL', label: 'Adult XL' },
  { value: 'A2XL', label: 'Adult 2XL' },
];

const HORSE_EXPERIENCE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'none', label: 'No Experience' },
  { value: 'some', label: 'Some Experience' },
  { value: 'regular', label: 'Regular Rider' },
  { value: 'advanced', label: 'Advanced' },
];

export interface MemberProfileData {
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  horseName?: string;
  horseExperience?: string;
  project?: string;
  birthday?: string;
  tshirtSize?: string;
  profilePhotoUrl?: string;
  horsePhotoUrl?: string;
  avatarChoice?: string;
}

interface MemberProfileFieldsProps {
  data: MemberProfileData;
  onChange: (updates: Partial<MemberProfileData>) => void;
  /** If provided, admin is editing on behalf of this user (sends userId in upload) */
  targetUserId?: string;
  onMessage?: (text: string, type: 'success' | 'error') => void;
  /** Compact mode uses smaller labels and spacing (for admin inline edit) */
  compact?: boolean;
}

export default function MemberProfileFields({ data, onChange, targetUserId, onMessage, compact }: MemberProfileFieldsProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState<'profile' | 'horse' | null>(null);

  const labelClass = compact
    ? 'block text-xs font-medium text-gray-600 mb-1'
    : 'block text-sm font-medium text-gray-700 mb-1';
  const inputClass = compact
    ? 'input'
    : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  const handlePhotoUpload = async (type: 'profile' | 'horse', file: File) => {
    if (!file.type.startsWith('image/')) {
      onMessage?.('Only image files are allowed', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onMessage?.('File too large (max 10 MB)', 'error');
      return;
    }

    setUploadingPhoto(type);
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
      if (type === 'profile') {
        onChange({ profilePhotoUrl: result.url });
      } else {
        onChange({ horsePhotoUrl: result.url });
      }
      onMessage?.(`${type === 'profile' ? 'Profile' : 'Horse'} photo uploaded!`, 'success');
    } catch {
      onMessage?.('Upload failed', 'error');
    } finally {
      setUploadingPhoto(null);
    }
  };

  return (
    <div className={compact ? '' : 'space-y-4'}>
      {/* Contact Info */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-${compact ? '3' : '4'}`}>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            className={inputClass}
            value={data.phone || ''}
            onChange={e => onChange({ phone: e.target.value })}
            placeholder="Phone number"
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            className={inputClass}
            value={data.address || ''}
            onChange={e => onChange({ address: e.target.value })}
            placeholder="Address"
          />
        </div>
        <div>
          <label className={labelClass}>Emergency Contact</label>
          <input
            className={inputClass}
            value={data.emergencyContact || ''}
            onChange={e => onChange({ emergencyContact: e.target.value })}
            placeholder="Emergency contact name"
          />
        </div>
        <div>
          <label className={labelClass}>Emergency Phone</label>
          <input
            className={inputClass}
            value={data.emergencyPhone || ''}
            onChange={e => onChange({ emergencyPhone: e.target.value })}
            placeholder="Emergency phone"
          />
        </div>
      </div>

      {/* 4H Member Info */}
      <div className={`border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-${compact ? '3' : '4'}`}>
        <div>
          <label className={labelClass}>Horse Name</label>
          <input
            className={inputClass}
            value={data.horseName || ''}
            onChange={e => onChange({ horseName: e.target.value })}
            placeholder="Your horse's name"
          />
        </div>
        <div>
          <label className={labelClass}>Horse Experience</label>
          <select
            className={inputClass}
            value={data.horseExperience || ''}
            onChange={e => onChange({ horseExperience: e.target.value })}
          >
            {HORSE_EXPERIENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Project</label>
          <input
            className={inputClass}
            value={data.project || ''}
            onChange={e => onChange({ project: e.target.value })}
            placeholder="Your 4H project"
          />
        </div>
        <div>
          <label className={labelClass}>Birthday</label>
          <input
            className={inputClass}
            type="date"
            value={data.birthday ? data.birthday.split('T')[0] : ''}
            onChange={e => onChange({ birthday: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>T-Shirt Size</label>
          <select
            className={inputClass}
            value={data.tshirtSize || ''}
            onChange={e => onChange({ tshirtSize: e.target.value })}
          >
            {TSHIRT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Photos & Avatar */}
      <div className="border-t pt-4 mt-4">
        <h5 className={compact ? 'text-sm font-semibold text-gray-700 mb-3' : 'text-lg font-medium text-gray-900 mb-4'}>
          Photos & Avatar
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Profile Photo */}
          <div>
            <label className={`${labelClass} mb-2`}>Profile Photo</label>
            <div className="flex items-center gap-3">
              {data.profilePhotoUrl ? (
                <img src={data.profilePhotoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No photo</div>
              )}
              <label className={`${compact ? 'btn-secondary text-sm' : 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50'} cursor-pointer transition-colors ${uploadingPhoto === 'profile' ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingPhoto === 'profile' ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload('profile', file);
                    e.target.value = '';
                  }}
                  disabled={uploadingPhoto !== null}
                />
              </label>
            </div>
          </div>

          {/* Horse Photo */}
          <div>
            <label className={`${labelClass} mb-2`}>Horse Photo</label>
            <div className="flex items-center gap-3">
              {data.horsePhotoUrl ? (
                <img src={data.horsePhotoUrl} alt="Horse" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No photo</div>
              )}
              <label className={`${compact ? 'btn-secondary text-sm' : 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50'} cursor-pointer transition-colors ${uploadingPhoto === 'horse' ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingPhoto === 'horse' ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload('horse', file);
                    e.target.value = '';
                  }}
                  disabled={uploadingPhoto !== null}
                />
              </label>
            </div>
          </div>

          {/* Avatar Choice */}
          <div>
            <label className={`${labelClass} mb-2`}>Avatar Display</label>
            <select
              className={inputClass}
              value={data.avatarChoice || 'initials'}
              onChange={e => onChange({ avatarChoice: e.target.value })}
            >
              <option value="initials">Initials</option>
              <option value="profile" disabled={!data.profilePhotoUrl}>Profile Photo{!data.profilePhotoUrl ? ' (no photo)' : ''}</option>
              <option value="horse" disabled={!data.horsePhotoUrl}>Horse Photo{!data.horsePhotoUrl ? ' (no photo)' : ''}</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Shown on member directory instead of initials</p>
          </div>
        </div>
      </div>
    </div>
  );
}
