import DOMPurify from 'dompurify';
import { useState, useEffect } from 'react';

import RichTextEditor from './RichTextEditor';

interface BlogGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isAdmin: boolean;
  onSave?: (content: string) => Promise<void>;
}

export default function BlogGuidelinesModal({
  isOpen,
  onClose,
  content,
  isAdmin,
  onSave,
}: BlogGuidelinesModalProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setEditContent(content);
    setEditing(false);
    setSaveError(null);
  }, [isOpen, content]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(editContent);
      setEditing(false);
    } catch {
      setSaveError('Failed to save guidelines. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidelines-modal-title"
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 id="guidelines-modal-title" className="text-xl font-bold text-gray-900">
            Blog Posting Guidelines
          </h2>
          <div className="flex items-center gap-3">
            {isAdmin && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {editing ? (
            <div>
              <RichTextEditor
                key="guidelines-editor"
                content={editContent}
                onChange={setEditContent}
                placeholder="Write the blog posting guidelines here..."
                showHeadings
              />
              {saveError && (
                <p className="text-sm text-red-600 mt-2">{saveError}</p>
              )}
            </div>
          ) : (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
            />
          )}
        </div>

        {editing && (
          <div className="p-4 border-t flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setEditing(false); setEditContent(content); }}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Guidelines'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
