import { useState, useEffect, useCallback } from 'react';

export interface SponsorFormData {
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

type ImageSource = 'site' | 'drive' | 'url';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  thumbnailLink: string | null;
}

// Known site images that work well as sponsor logos
const SITE_IMAGES = [
  { path: '/images/betsy realtor (1).jpg', label: 'Betsy Realtor' },
  { path: '/images/fusion logo.jpg', label: 'Fusion Logo' },
  { path: '/images/kp quarter horses.jpg', label: 'KP Quarter Horses' },
  { path: '/images/murdochs.webp', label: "Murdoch's" },
  { path: '/images/gj banner.jpg', label: 'GJ Banner' },
  { path: '/images/grey tail banner.jpg', label: 'Grey Tail Banner' },
  { path: '/images/power cone banner.jpg', label: 'Power Cone Banner' },
  { path: '/images/4H logo.jpeg', label: '4-H Logo' },
];

/** Convert a Google Drive file ID to a directly embeddable image URL */
function driveImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/** Extract a Drive file ID from various Google Drive URL formats */
function extractDriveFileId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view...
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  // https://drive.google.com/open?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

export default function SponsorModal({ isOpen, onClose, onSave, initialData, mode }: SponsorModalProps) {
  const [formData, setFormData] = useState<SponsorFormData>({
    name: initialData?.name || '',
    logoUrl: initialData?.logoUrl || '',
    websiteUrl: initialData?.websiteUrl || '',
    description: initialData?.description || '',
  });
  const [imageSource, setImageSource] = useState<ImageSource>('site');
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  const [driveFolderName, setDriveFolderName] = useState<string>('');
  const [driveFolderStack, setDriveFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [membersRootId, setMembersRootId] = useState<string>('');

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Reset form when initialData changes (opening modal for a different sponsor)
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        logoUrl: initialData?.logoUrl || '',
        websiteUrl: initialData?.websiteUrl || '',
        description: initialData?.description || '',
      });
      // Detect initial image source from the URL
      const url = initialData?.logoUrl || '';
      if (url.includes('lh3.googleusercontent.com') || url.includes('drive.google.com')) {
        setImageSource('drive');
      } else if (url.startsWith('/images/')) {
        setImageSource('site');
      } else if (url) {
        setImageSource('url');
      } else {
        setImageSource('site');
      }
    }
  }, [isOpen, initialData]);

  // Fetch root Drive folders on first open of the Drive tab
  const fetchDriveFolders = useCallback(async () => {
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `query { driveFolders { id name accessLevel } }`,
        }),
      });
      const result = await res.json();
      const folders = result.data?.driveFolders || [];
      const membersFolder = folders.find((f: any) => f.accessLevel === 'members');
      if (membersFolder) {
        setMembersRootId(membersFolder.id);
        return membersFolder.id;
      }
    } catch {
      setDriveError('Failed to load Drive folders');
    }
    return null;
  }, [graphqlUrl, getHeaders]);

  const fetchDriveFiles = useCallback(async (folderId: string) => {
    setDriveLoading(true);
    setDriveError(null);
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `query DriveFiles($folderId: String!) {
            driveFiles(folderId: $folderId) {
              files { id name mimeType isFolder thumbnailLink }
              currentFolderName
            }
          }`,
          variables: { folderId },
        }),
      });
      const result = await res.json();
      if (result.errors?.length) {
        setDriveError(result.errors[0].message);
        setDriveFiles([]);
        return;
      }
      const data = result.data?.driveFiles;
      if (data) {
        // Show folders first, then images only
        const files = (data.files || []).filter(
          (f: DriveFile) => f.isFolder || f.mimeType.startsWith('image/')
        );
        setDriveFiles(files);
        setDriveFolderName(data.currentFolderName || '');
      }
    } catch {
      setDriveError('Failed to load Drive files');
    } finally {
      setDriveLoading(false);
    }
  }, [graphqlUrl, getHeaders]);

  // When switching to Drive tab, load the root members folder
  useEffect(() => {
    if (isOpen && imageSource === 'drive' && !driveFolderId) {
      (async () => {
        let rootId = membersRootId;
        if (!rootId) {
          rootId = (await fetchDriveFolders()) || '';
        }
        if (rootId) {
          setDriveFolderId(rootId);
          setDriveFolderStack([]);
          fetchDriveFiles(rootId);
        }
      })();
    }
  }, [isOpen, imageSource, driveFolderId, membersRootId, fetchDriveFolders, fetchDriveFiles]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setDriveFolderStack((prev) => [...prev, { id: driveFolderId, name: driveFolderName }]);
    setDriveFolderId(folderId);
    fetchDriveFiles(folderId);
  };

  const navigateBack = () => {
    const prev = [...driveFolderStack];
    const parent = prev.pop();
    if (parent) {
      setDriveFolderStack(prev);
      setDriveFolderId(parent.id);
      fetchDriveFiles(parent.id);
    }
  };

  const selectDriveFile = (file: DriveFile) => {
    const url = driveImageUrl(file.id);
    setFormData((f) => ({ ...f, logoUrl: url }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If a Drive share URL was pasted, convert it to an embeddable URL
    const driveId = extractDriveFileId(formData.logoUrl);
    const finalData = driveId
      ? { ...formData, logoUrl: driveImageUrl(driveId) }
      : formData;
    onSave(finalData);
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
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
              &times;
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

              {/* Logo Image Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Image *
                </label>

                {/* Source tabs */}
                <div className="flex border-b border-gray-200 mb-3">
                  {([
                    { key: 'site' as const, label: 'Site Images' },
                    { key: 'drive' as const, label: 'Google Drive' },
                    { key: 'url' as const, label: 'Custom URL' },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setImageSource(tab.key)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                        imageSource === tab.key
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Site Images Grid */}
                {imageSource === 'site' && (
                  <div className="grid grid-cols-4 gap-3">
                    {SITE_IMAGES.map((img) => (
                      <button
                        key={img.path}
                        type="button"
                        onClick={() => handleChange('logoUrl', img.path)}
                        className={`relative rounded-lg border-2 p-1 transition-all ${
                          formData.logoUrl === img.path
                            ? 'border-primary-500 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img.path}
                          alt={img.label}
                          className="w-full h-16 object-contain rounded"
                        />
                        <p className="text-xs text-gray-600 mt-1 truncate">{img.label}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Google Drive Browser */}
                {imageSource === 'drive' && (
                  <div className="border border-gray-200 rounded-lg">
                    {/* Breadcrumb / navigation */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200 text-sm">
                      {driveFolderStack.length > 0 && (
                        <button
                          type="button"
                          onClick={navigateBack}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          &larr; Back
                        </button>
                      )}
                      <span className="text-gray-600 truncate">
                        {driveFolderName || 'Members Files'}
                      </span>
                    </div>

                    <div className="p-3 max-h-64 overflow-y-auto">
                      {driveLoading && (
                        <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
                      )}
                      {driveError && (
                        <p className="text-sm text-red-600 text-center py-4">{driveError}</p>
                      )}
                      {!driveLoading && !driveError && driveFiles.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No images or folders found</p>
                      )}
                      <div className="grid grid-cols-4 gap-3">
                        {driveFiles.map((file) => (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() =>
                              file.isFolder
                                ? navigateToFolder(file.id, file.name)
                                : selectDriveFile(file)
                            }
                            className={`relative rounded-lg border-2 p-1 transition-all text-left ${
                              !file.isFolder && formData.logoUrl === driveImageUrl(file.id)
                                ? 'border-primary-500 ring-2 ring-primary-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {file.isFolder ? (
                              <div className="w-full h-16 flex items-center justify-center bg-gray-100 rounded">
                                <span className="text-2xl">📁</span>
                              </div>
                            ) : (
                              <img
                                src={file.thumbnailLink || driveImageUrl(file.id)}
                                alt={file.name}
                                className="w-full h-16 object-contain rounded bg-gray-50"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Paste Drive link shortcut */}
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-1">Or paste a Google Drive share link:</p>
                      <input
                        type="text"
                        className="input text-sm"
                        placeholder="https://drive.google.com/file/d/.../"
                        onChange={(e) => {
                          const id = extractDriveFileId(e.target.value);
                          if (id) {
                            setFormData((f) => ({ ...f, logoUrl: driveImageUrl(id) }));
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Custom URL */}
                {imageSource === 'url' && (
                  <input
                    type="text"
                    className="input"
                    value={formData.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                )}

                {/* Preview */}
                {formData.logoUrl && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="max-h-20 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1 truncate">{formData.logoUrl}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  className="input"
                  value={formData.websiteUrl}
                  onChange={(e) => handleChange('websiteUrl', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
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
              <button type="submit" className="btn-primary" disabled={!formData.name || !formData.logoUrl}>
                {mode === 'create' ? 'Add Sponsor' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
