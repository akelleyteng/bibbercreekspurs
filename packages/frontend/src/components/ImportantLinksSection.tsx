import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/authFetch';

export interface ImportantLink {
  id: string;
  title: string;
  url: string;
  category?: string | null;
  description?: string | null;
  orderIndex?: number | null;
  isActive: boolean;
}

interface LinkFormState {
  title: string;
  url: string;
  category: string;
  description: string;
}

const EMPTY_FORM: LinkFormState = { title: '', url: '', category: '', description: '' };

const UNCATEGORIZED = 'Other';

const LINKS_QUERY = `query ImportantLinks($activeOnly: Boolean) {
  importantLinks(activeOnly: $activeOnly) {
    id title url category description orderIndex isActive
  }
}`;

/**
 * "Important Links" section shown at the top of the Important Docs & Links page.
 * Members see a read-only, category-grouped list; admins can add/edit/delete links.
 * Self-contained (fetches its own data) to keep the parent page unchanged.
 */
export function ImportantLinksSection({ isAdmin }: { isAdmin: boolean }) {
  const [links, setLinks] = useState<ImportantLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin edit state: null = not editing, 'new' = adding, otherwise the link id being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LinkFormState>(EMPTY_FORM);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admins also see inactive (hidden) links so they can manage them.
      const result = await authFetch(LINKS_QUERY, { activeOnly: !isAdmin });
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to load links');
        return;
      }
      setLinks(result.data?.importantLinks || []);
    } catch {
      setError('Failed to load links');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId('new');
  };

  const startEdit = (link: ImportantLink) => {
    setForm({
      title: link.title,
      url: link.url,
      category: link.category || '',
      description: link.description || '',
    });
    setEditingId(link.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError('Title and URL are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
    };
    try {
      const result =
        editingId === 'new'
          ? await authFetch(
              `mutation CreateImportantLink($input: CreateImportantLinkInput!) {
                createImportantLink(input: $input) { id }
              }`,
              { input },
            )
          : await authFetch(
              `mutation UpdateImportantLink($id: String!, $input: UpdateImportantLinkInput!) {
                updateImportantLink(id: $id, input: $input) { id }
              }`,
              { id: editingId, input },
            );
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to save link');
        return;
      }
      cancelEdit();
      await fetchLinks();
    } catch {
      setError('Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (link: ImportantLink) => {
    if (!confirm(`Delete "${link.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const result = await authFetch(
        `mutation DeleteImportantLink($id: String!) { deleteImportantLink(id: $id) }`,
        { id: link.id },
      );
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to delete link');
        return;
      }
      await fetchLinks();
    } catch {
      setError('Failed to delete link');
    }
  };

  // Hide the whole section for members when there's nothing to show.
  if (loading) {
    return (
      <div className="card mb-6" aria-busy="true">
        <div className="animate-pulse h-5 w-40 bg-gray-200 rounded" />
      </div>
    );
  }
  if (!isAdmin && links.length === 0) return null;

  // Group by category, preserving fetch order (already sorted by orderIndex/category server-side).
  const grouped = links.reduce<Record<string, ImportantLink[]>>((acc, link) => {
    const key = link.category?.trim() || UNCATEGORIZED;
    (acc[key] ||= []).push(link);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  return (
    <section className="card mb-6" aria-labelledby="important-links-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="important-links-heading" className="text-xl font-semibold text-gray-900">
          🔗 Important Links
        </h2>
        {isAdmin && editingId === null && (
          <button onClick={startAdd} className="btn-primary text-sm">
            + Add Link
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {editingId === 'new' && (
        <LinkForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={cancelEdit}
          saving={saving}
        />
      )}

      {categories.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No links yet. Use “Add Link” to add resources like the Colorado 4-H Rule Book, Record Book, or Fair information.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              {categories.length > 1 || category !== UNCATEGORIZED ? (
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {category}
                </h3>
              ) : null}
              <ul className="space-y-1">
                {grouped[category].map((link) =>
                  editingId === link.id ? (
                    <li key={link.id}>
                      <LinkForm
                        form={form}
                        setForm={setForm}
                        onSave={handleSave}
                        onCancel={cancelEdit}
                        saving={saving}
                      />
                    </li>
                  ) : (
                    <li
                      key={link.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-medium text-primary-600 hover:text-primary-700 underline break-words ${
                            !link.isActive ? 'opacity-50' : ''
                          }`}
                        >
                          {link.title}
                        </a>
                        {isAdmin && !link.isActive && (
                          <span className="ml-2 text-xs text-gray-400">(hidden)</span>
                        )}
                        {link.description && (
                          <p className="text-sm text-gray-500 break-words">{link.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <button
                            onClick={() => startEdit(link)}
                            className="text-blue-500 hover:text-blue-700 text-sm px-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(link)}
                            className="text-red-500 hover:text-red-700 text-sm px-2"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LinkForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: LinkFormState;
  setForm: (f: LinkFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Title *</span>
          <input
            type="text"
            className="input text-sm mt-1"
            placeholder="Colorado 4-H Rule Book"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Category</span>
          <input
            type="text"
            className="input text-sm mt-1"
            placeholder="4-H Resources"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">URL *</span>
        <input
          type="url"
          className="input text-sm mt-1"
          placeholder="https://..."
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Description</span>
        <input
          type="text"
          className="input text-sm mt-1"
          placeholder="Optional short description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <div className="flex items-center gap-2">
        <button onClick={onSave} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} disabled={saving} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
