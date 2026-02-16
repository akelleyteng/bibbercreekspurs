import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  iconLink: string | null;
  thumbnailLink: string | null;
  createdTime: string;
  modifiedTime: string;
}

interface FolderInfo {
  id: string;
  name: string;
  accessLevel: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
const apiBaseUrl = graphqlUrl.replace('/graphql', '');

function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'application/vnd.google-apps.spreadsheet') return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType === 'application/vnd.google-apps.presentation') return '📽️';
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType === 'application/vnd.google-apps.document') return '📝';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) return '📦';
  return '📎';
}

function formatFileSize(bytes: string | null): string {
  if (!bytes) return '—';
  const b = parseInt(bytes, 10);
  if (isNaN(b)) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DriveFilesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Shared Files' }]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `query { driveFolders { id name accessLevel } }`,
        }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to load folders');
        return;
      }
      setFolders(result.data?.driveFolders || []);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchFiles = useCallback(async (folderId: string, pageToken?: string | null) => {
    if (pageToken) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setFiles([]);
    }
    setError(null);

    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `query DriveFiles($folderId: String!, $pageToken: String) {
            driveFiles(folderId: $folderId, pageToken: $pageToken) {
              files { id name mimeType isFolder size webViewLink webContentLink iconLink thumbnailLink createdTime modifiedTime }
              nextPageToken
              currentFolderId
              currentFolderName
            }
          }`,
          variables: { folderId, pageToken },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to load files');
        return;
      }
      const data = result.data?.driveFiles;
      if (data) {
        if (pageToken) {
          setFiles((prev) => [...prev, ...data.files]);
        } else {
          setFiles(data.files);
        }
        setNextPageToken(data.nextPageToken || null);
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    setNextPageToken(null);
    fetchFiles(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setNextPageToken(null);

    if (crumb.id === null) {
      setCurrentFolderId(null);
      setFiles([]);
      fetchFolders();
    } else {
      setCurrentFolderId(crumb.id);
      fetchFiles(crumb.id);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFolderId) return;

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', currentFolderId);

      const res = await fetch(`${apiBaseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        fetchFiles(currentFolderId);
      } else {
        const err = await res.json();
        setError(err.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `mutation DeleteDriveFile($fileId: String!) { deleteDriveFile(fileId: $fileId) }`,
          variables: { fileId },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to delete');
        return;
      }
      if (currentFolderId) fetchFiles(currentFolderId);
    } catch {
      setError('Failed to delete file');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentFolderId) return;

    try {
      const res = await fetch(graphqlUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: `mutation CreateDriveFolder($folderName: String!, $parentFolderId: String!) {
            createDriveFolder(folderName: $folderName, parentFolderId: $parentFolderId) { id name }
          }`,
          variables: { folderName: newFolderName.trim(), parentFolderId: currentFolderId },
        }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to create folder');
        return;
      }
      setNewFolderName('');
      setShowNewFolderInput(false);
      fetchFiles(currentFolderId);
    } catch {
      setError('Failed to create folder');
    }
  };

  // Root view: show folder cards
  if (!currentFolderId) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shared Files</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading folders...</span>
          </div>
        ) : folders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 text-lg">No shared folders available.</p>
            <p className="text-gray-400 text-sm mt-2">Contact an administrator to set up Google Drive integration.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateToFolder(folder.id, folder.name)}
                className="card text-left hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center">
                  <span className="text-4xl mr-4">
                    {folder.accessLevel === 'leadership' ? '🔒' : '📁'}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{folder.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {folder.accessLevel === 'leadership'
                        ? 'Officers & Admins only'
                        : 'All members'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Folder view: show files
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Shared Files</h1>

      {/* Breadcrumbs */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center flex-wrap text-sm">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {index < breadcrumbs.length - 1 ? (
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {crumb.name}
                </button>
              ) : (
                <span className="text-gray-700 font-medium">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Admin toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-3 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-sm"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>

          {showNewFolderInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input text-sm"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); }
                }}
                autoFocus
              />
              <button onClick={handleCreateFolder} className="btn-primary text-sm">
                Create
              </button>
              <button
                onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="btn-secondary text-sm"
            >
              New Folder
            </button>
          )}
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">This folder is empty.</p>
          {isAdmin && (
            <p className="text-gray-400 text-sm mt-2">Use the Upload button to add files.</p>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div
                  className={`flex items-center flex-1 min-w-0 ${file.isFolder ? 'cursor-pointer' : ''}`}
                  onClick={file.isFolder ? () => navigateToFolder(file.id, file.name) : undefined}
                >
                  <span className="text-2xl mr-3 flex-shrink-0">
                    {getFileIcon(file.mimeType)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {file.isFolder ? 'Folder' : formatFileSize(file.size)}
                      {' · '}
                      Modified {formatDate(file.modifiedTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {!file.isFolder && file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm"
                    >
                      Open
                    </a>
                  )}
                  {!file.isFolder && file.webContentLink && (
                    <a
                      href={file.webContentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm"
                    >
                      Download
                    </a>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {nextPageToken && (
            <div className="mt-4 pt-4 border-t text-center">
              <button
                onClick={() => currentFolderId && fetchFiles(currentFolderId, nextPageToken)}
                disabled={loadingMore}
                className="btn-secondary"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
