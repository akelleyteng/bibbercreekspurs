import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';
import { useCart, CartDecoration } from '../context/CartContext';

interface Color {
  name: string;
  hex?: string | null;
}

interface Decoration {
  id: string;
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
  creditEligible: boolean;
  decorations: Decoration[];
}

const PRODUCT_QUERY = `query CatalogProduct($id: String!) {
  catalogProduct(id: $id) {
    id itemType name brandStyle description imageUrl blankCostCents
    colors { name hex } sizes creditEligible
    decorations { id decorationType label placementOptions priceCents requiresText sortOrder }
  }
}`;

const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

// Per-decoration selection state
interface DecoSelection {
  selected: boolean;
  placement?: string;
  text: string;
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { addItem, openDrawer } = useCart();

  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [color, setColor] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [decoState, setDecoState] = useState<Record<string, DecoSelection>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(PRODUCT_QUERY, { id: productId });
      if (res.errors) {
        setError(res.errors[0]?.message || 'Failed to load product');
        return;
      }
      const p: CatalogProduct | null = res.data?.catalogProduct || null;
      setProduct(p);
      if (p) {
        setColor(p.colors[0]?.name ?? '');
        setSize(p.sizes[0] ?? '');
        setDecoState(
          Object.fromEntries(
            p.decorations.map((d) => [d.id, { selected: false, placement: d.placementOptions[0], text: '' }])
          )
        );
      }
    } catch {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const unitPriceCents = useMemo(() => {
    if (!product) return 0;
    const decoTotal = product.decorations.reduce(
      (sum, d) => sum + (decoState[d.id]?.selected ? d.priceCents : 0),
      0
    );
    return product.blankCostCents + decoTotal;
  }, [product, decoState]);

  const handleAddToCart = () => {
    if (!product) return;
    setValidationError(null);

    if (product.colors.length > 0 && !color) {
      setValidationError('Please choose a color.');
      return;
    }
    if (product.sizes.length > 0 && !size) {
      setValidationError('Please choose a size.');
      return;
    }
    const chosen: CartDecoration[] = [];
    for (const d of product.decorations) {
      const s = decoState[d.id];
      if (!s?.selected) continue;
      if (d.requiresText && !s.text.trim()) {
        setValidationError(`Please enter the text for "${d.label}".`);
        return;
      }
      chosen.push({
        decorationId: d.id,
        label: d.label,
        placement: s.placement,
        text: d.requiresText ? s.text.trim() : undefined,
        priceCents: d.priceCents,
      });
    }

    addItem({
      productId: product.id,
      productName: product.name,
      itemType: product.itemType,
      imageUrl: product.imageUrl ?? undefined,
      color: color || undefined,
      size: size || undefined,
      decorations: chosen,
      unitPriceCents,
      quantity,
    });
    setAdded(true);
    openDrawer();
  };

  const setDeco = (id: string, patch: Partial<DecoSelection>) =>
    setDecoState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <span className="ml-3 text-gray-600">Loading…</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">{error || 'Product not found.'}</p>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/shop" className="text-primary-600 hover:text-primary-700 text-sm">&larr; Back to Shop</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-7xl" aria-hidden="true">👕</span>
          )}
        </div>

        {/* Details + configurator */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500">{product.itemType}{product.brandStyle ? ` · ${product.brandStyle}` : ''}</p>
          {product.creditEligible && (
            <span className="inline-block mt-2 text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              Credit eligible
            </span>
          )}
          {product.description && <p className="text-gray-700 mt-3">{product.description}</p>}

          <p className="text-2xl font-bold text-gray-900 mt-4">{formatPrice(unitPriceCents)}</p>

          {/* Color */}
          {product.colors.length > 0 && (
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
                      color === c.name ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-700 hover:border-primary-300'
                    }`}
                  >
                    <span className="inline-block h-4 w-4 rounded-full border border-gray-300" style={{ backgroundColor: c.hex || '#fff' }} aria-hidden="true" />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {product.sizes.length > 0 && (
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      size === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-700 hover:border-primary-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Decorations */}
          {product.decorations.length > 0 && (
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Customizations</label>
              {product.decorations.map((d) => {
                const s = decoState[d.id];
                return (
                  <div key={d.id} className="border border-gray-200 rounded-lg p-3">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={s?.selected ?? false}
                          onChange={(e) => setDeco(d.id, { selected: e.target.checked })}
                        />
                        {d.label}
                      </span>
                      <span className="text-sm text-gray-500">+{formatPrice(d.priceCents)}</span>
                    </label>
                    {s?.selected && (
                      <div className="mt-2 pl-6 space-y-2">
                        {d.placementOptions.length > 0 && (
                          <select
                            className="input text-sm"
                            value={s.placement}
                            onChange={(e) => setDeco(d.id, { placement: e.target.value })}
                          >
                            {d.placementOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        )}
                        {d.requiresText && (
                          <input
                            className="input text-sm"
                            placeholder="Enter text (e.g. name)"
                            value={s.text}
                            onChange={(e) => setDeco(d.id, { text: e.target.value })}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity */}
          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">-</button>
              <span className="w-10 text-center">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(20, q + 1))} className="w-9 h-9 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">+</button>
            </div>
          </div>

          {validationError && <p className="text-red-600 text-sm mt-4">{validationError}</p>}

          <button onClick={handleAddToCart} className="btn-primary w-full sm:w-auto mt-6">
            Add to Cart — {formatPrice(unitPriceCents * quantity)}
          </button>
          {added && (
            <p className="text-green-700 text-sm mt-2">Added to cart. <Link to="/shop/cart" className="underline">View cart</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
