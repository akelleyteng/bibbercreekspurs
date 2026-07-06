import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/authFetch';

// ── Types ──

interface Color {
  name: string;
  hex?: string | null;
}

interface Decoration {
  id?: string;
  decorationType: string;
  label: string;
  placementOptions: string[];
  priceCents: number;
  requiresText: boolean;
  sortOrder: number;
}

interface CatalogProduct {
  id: string;
  itemType: string;
  name: string;
  brandStyle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  blankCostCents: number;
  colors: Color[];
  sizes: string[];
  isVisible: boolean;
  creditEligible: boolean;
  sortOrder: number;
  decorations: Decoration[];
}

const DECORATION_TYPES: { value: string; label: string; requiresText: boolean }[] = [
  { value: 'front_logo', label: 'Front Logo', requiresText: false },
  { value: 'back_name', label: 'Name on Back', requiresText: true },
  { value: 'leg_logo', label: 'Leg Logo (sweatpants)', requiresText: false },
  { value: 'leg_name', label: 'Leg Name (sweatpants)', requiresText: true },
];

const ITEM_TYPES = ['Tee', 'Tank', 'Crew', 'Hoodie', 'Sweatpants'];

const PRODUCT_FIELDS = `
  id itemType name brandStyle description imageUrl blankCostCents
  colors { name hex } sizes isVisible creditEligible sortOrder
  decorations { id decorationType label placementOptions priceCents requiresText sortOrder }
`;

// ── Money helpers ──

const centsToDollars = (cents: number): string => (cents / 100).toFixed(2);
const dollarsToCents = (dollars: string): number => Math.round((parseFloat(dollars) || 0) * 100);

// ── Editable form shape (money as dollar strings) ──

interface DecoForm {
  decorationType: string;
  label: string;
  placement: string; // comma-separated
  price: string; // dollars
  requiresText: boolean;
}

interface FormState {
  id?: string;
  itemType: string;
  name: string;
  brandStyle: string;
  description: string;
  imageUrl: string;
  blankCost: string;
  colors: Color[];
  sizes: string[];
  isVisible: boolean;
  creditEligible: boolean;
  sortOrder: string;
  decorations: DecoForm[];
}

const emptyForm = (): FormState => ({
  itemType: ITEM_TYPES[0],
  name: '',
  brandStyle: '',
  description: '',
  imageUrl: '',
  blankCost: '0.00',
  colors: [],
  sizes: [],
  isVisible: false,
  creditEligible: false,
  sortOrder: '0',
  decorations: [],
});

const productToForm = (p: CatalogProduct): FormState => ({
  id: p.id,
  itemType: p.itemType,
  name: p.name,
  brandStyle: p.brandStyle || '',
  description: p.description || '',
  imageUrl: p.imageUrl || '',
  blankCost: centsToDollars(p.blankCostCents),
  colors: p.colors.map((c) => ({ name: c.name, hex: c.hex || '#000000' })),
  sizes: [...p.sizes],
  isVisible: p.isVisible,
  creditEligible: p.creditEligible,
  sortOrder: String(p.sortOrder),
  decorations: p.decorations.map((d) => ({
    decorationType: d.decorationType,
    label: d.label,
    placement: (d.placementOptions || []).join(', '),
    price: centsToDollars(d.priceCents),
    requiresText: d.requiresText,
  })),
});

const formToInput = (f: FormState) => ({
  itemType: f.itemType,
  name: f.name.trim(),
  brandStyle: f.brandStyle.trim() || undefined,
  description: f.description.trim() || undefined,
  imageUrl: f.imageUrl.trim() || undefined,
  blankCostCents: dollarsToCents(f.blankCost),
  colors: f.colors
    .filter((c) => c.name.trim())
    .map((c) => ({ name: c.name.trim(), hex: c.hex || undefined })),
  sizes: f.sizes.map((s) => s.trim()).filter(Boolean),
  isVisible: f.isVisible,
  creditEligible: f.creditEligible,
  sortOrder: parseInt(f.sortOrder, 10) || 0,
  decorations: f.decorations
    .filter((d) => d.label.trim())
    .map((d) => ({
      decorationType: d.decorationType,
      label: d.label.trim(),
      placementOptions: d.placement
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      priceCents: dollarsToCents(d.price),
      requiresText: d.requiresText,
    })),
});

// ── Component ──

export default function AdminCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null); // null = list view
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`query { adminCatalogProducts { ${PRODUCT_FIELDS} } }`);
      if (res.errors) {
        setError(res.errors[0]?.message || 'Failed to load catalog');
        return;
      }
      setProducts(res.data?.adminCatalogProducts || []);
    } catch {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const input = formToInput(form);
    try {
      const res = form.id
        ? await authFetch(
            `mutation($input: UpdateCatalogProductInput!) { updateCatalogProduct(input: $input) { id } }`,
            { input: { id: form.id, ...input } }
          )
        : await authFetch(
            `mutation($input: CreateCatalogProductInput!) { createCatalogProduct(input: $input) { id } }`,
            { input }
          );
      if (res.errors) {
        setError(res.errors[0]?.message || 'Failed to save product');
        return;
      }
      setForm(null);
      await fetchProducts();
    } catch {
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: CatalogProduct) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setError(null);
    const res = await authFetch(
      `mutation($id: String!) { deleteCatalogProduct(id: $id) }`,
      { id: p.id }
    );
    if (res.errors) {
      setError(res.errors[0]?.message || 'Failed to delete product');
      return;
    }
    await fetchProducts();
  };

  const toggleFlag = async (p: CatalogProduct, field: 'isVisible' | 'creditEligible') => {
    setError(null);
    const res = await authFetch(
      `mutation($input: UpdateCatalogProductInput!) { updateCatalogProduct(input: $input) { id } }`,
      { input: { id: p.id, [field]: !p[field] } }
    );
    if (res.errors) {
      setError(res.errors[0]?.message || 'Failed to update product');
      return;
    }
    await fetchProducts();
  };

  if (loading) {
    return <p className="text-gray-500 py-8">Loading catalog…</p>;
  }

  if (form) {
    return (
      <ProductForm
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onCancel={() => { setForm(null); setError(null); }}
        saving={saving}
        error={error}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Apparel Catalog</h2>
          <p className="text-sm text-gray-500">Custom screen-print products (Alpine Apparel).</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm()); setError(null); }}>
          + Add Product
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {products.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No products yet.</p>
          <p className="text-gray-400 text-sm mt-1">Add the club's apparel (hoodie, tee, sweatpants, …).</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-2">Product</th>
                <th className="p-2">Blank</th>
                <th className="p-2">Options</th>
                <th className="p-2 text-center">Visible</th>
                <th className="p-2 text-center">Credit</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-2">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-gray-500 text-xs">
                      {p.itemType}{p.brandStyle ? ` · ${p.brandStyle}` : ''}
                    </div>
                  </td>
                  <td className="p-2 text-gray-700">${centsToDollars(p.blankCostCents)}</td>
                  <td className="p-2 text-gray-500 text-xs">
                    {p.colors.length} colors · {p.sizes.length} sizes · {p.decorations.length} decorations
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleFlag(p, 'isVisible')}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isVisible ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => toggleFlag(p, 'creditEligible')}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.creditEligible ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.creditEligible ? 'Eligible' : 'No'}
                    </button>
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => { setForm(productToForm(p)); setError(null); }}
                      className="text-blue-600 hover:text-blue-800 px-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Product create/edit form ──

function ProductForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  error,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [newSize, setNewSize] = useState('');
  const update = (patch: Partial<FormState>) => setForm({ ...form, ...patch });

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {form.id ? 'Edit Product' : 'Add Product'}
      </h2>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Item type</span>
            <select className="input mt-1" value={form.itemType} onChange={(e) => update({ itemType: e.target.value })}>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Name *</span>
            <input className="input mt-1" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Club Hoodie" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Blank brand / style</span>
            <input className="input mt-1" value={form.brandStyle} onChange={(e) => update({ brandStyle: e.target.value })} placeholder="Gildan SF500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Blank cost ($)</span>
            <input type="number" step="0.01" min="0" className="input mt-1" value={form.blankCost} onChange={(e) => update({ blankCost: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Image URL</span>
            <input className="input mt-1" value={form.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea className="input mt-1" rows={2} value={form.description} onChange={(e) => update({ description: e.target.value })} />
          </label>
        </div>

        {/* Colors */}
        <fieldset className="border border-gray-200 rounded-lg p-3">
          <legend className="text-sm font-medium text-gray-700 px-1">Colors</legend>
          <div className="space-y-2">
            {form.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={c.hex || '#000000'} onChange={(e) => {
                  const colors = [...form.colors]; colors[i] = { ...colors[i], hex: e.target.value }; update({ colors });
                }} className="h-9 w-10 rounded border" />
                <input className="input flex-1" placeholder="Black" value={c.name} onChange={(e) => {
                  const colors = [...form.colors]; colors[i] = { ...colors[i], name: e.target.value }; update({ colors });
                }} />
                <button className="text-red-500 hover:text-red-700 text-sm px-2" onClick={() => update({ colors: form.colors.filter((_, x) => x !== i) })}>Remove</button>
              </div>
            ))}
            <button className="btn-secondary text-sm" onClick={() => update({ colors: [...form.colors, { name: '', hex: '#000000' }] })}>+ Add color</button>
          </div>
        </fieldset>

        {/* Sizes */}
        <fieldset className="border border-gray-200 rounded-lg p-3">
          <legend className="text-sm font-medium text-gray-700 px-1">Sizes</legend>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.sizes.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm">
                {s}
                <button className="text-gray-400 hover:text-red-600" onClick={() => update({ sizes: form.sizes.filter((_, x) => x !== i) })}>×</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input text-sm"
              placeholder="Adult M"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSize.trim()) { e.preventDefault(); update({ sizes: [...form.sizes, newSize.trim()] }); setNewSize(''); }
              }}
            />
            <button className="btn-secondary text-sm" onClick={() => { if (newSize.trim()) { update({ sizes: [...form.sizes, newSize.trim()] }); setNewSize(''); } }}>+ Add size</button>
          </div>
        </fieldset>

        {/* Decorations */}
        <fieldset className="border border-gray-200 rounded-lg p-3">
          <legend className="text-sm font-medium text-gray-700 px-1">Decorations (customizations)</legend>
          <div className="space-y-3">
            {form.decorations.map((d, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-12 items-center border-b border-gray-100 pb-2">
                <select className="input sm:col-span-3" value={d.decorationType} onChange={(e) => {
                  const decorations = [...form.decorations];
                  const preset = DECORATION_TYPES.find((t) => t.value === e.target.value);
                  decorations[i] = { ...decorations[i], decorationType: e.target.value, requiresText: preset?.requiresText ?? decorations[i].requiresText };
                  update({ decorations });
                }}>
                  {DECORATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input className="input sm:col-span-3" placeholder="Label" value={d.label} onChange={(e) => {
                  const decorations = [...form.decorations]; decorations[i] = { ...decorations[i], label: e.target.value }; update({ decorations });
                }} />
                <input className="input sm:col-span-3" placeholder="Placements (comma-sep)" value={d.placement} onChange={(e) => {
                  const decorations = [...form.decorations]; decorations[i] = { ...decorations[i], placement: e.target.value }; update({ decorations });
                }} />
                <input type="number" step="0.01" min="0" className="input sm:col-span-2" placeholder="$" value={d.price} onChange={(e) => {
                  const decorations = [...form.decorations]; decorations[i] = { ...decorations[i], price: e.target.value }; update({ decorations });
                }} />
                <button className="text-red-500 hover:text-red-700 text-sm sm:col-span-1" onClick={() => update({ decorations: form.decorations.filter((_, x) => x !== i) })}>×</button>
                <label className="sm:col-span-12 text-xs text-gray-500 flex items-center gap-1">
                  <input type="checkbox" checked={d.requiresText} onChange={(e) => {
                    const decorations = [...form.decorations]; decorations[i] = { ...decorations[i], requiresText: e.target.checked }; update({ decorations });
                  }} />
                  Requires text entry (e.g. personalization name)
                </label>
              </div>
            ))}
            <button className="btn-secondary text-sm" onClick={() => update({ decorations: [...form.decorations, { decorationType: 'front_logo', label: '', placement: '', price: '0.00', requiresText: false }] })}>+ Add decoration</button>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isVisible} onChange={(e) => update({ isVisible: e.target.checked })} />
            Visible in shop
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.creditEligible} onChange={(e) => update({ creditEligible: e.target.checked })} />
            Credit eligible
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Sort order
            <input type="number" className="input w-20" value={form.sortOrder} onChange={(e) => update({ sortOrder: e.target.value })} />
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
