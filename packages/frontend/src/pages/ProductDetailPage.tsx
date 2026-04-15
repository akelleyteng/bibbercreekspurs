import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';

import { authFetch } from '../utils/authFetch';
import { useCart } from '../context/CartContext';

interface ShopVariant {
  variantId: number;
  name: string;
  size?: string;
  color?: string;
  colorHex?: string;
  thumbnailUrl?: string;
  inStock: boolean;
  retailPriceCents?: number;
}

interface ShopProduct {
  id: string;
  printfulId: number;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  retailPriceCents?: number;
  creditEligible: boolean;
  variants: ShopVariant[];
}

const PRODUCT_QUERY = `
  query ShopProduct($printfulId: Int!) {
    shopProduct(printfulId: $printfulId) {
      id printfulId name description thumbnailUrl retailPriceCents creditEligible
      variants { variantId name size color colorHex thumbnailUrl inStock retailPriceCents }
    }
  }
`;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { addItem, openDrawer } = useCart();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      try {
        const result = await authFetch(PRODUCT_QUERY, {
          printfulId: parseInt(productId, 10),
        });
        if (result.errors) {
          setError(result.errors[0]?.message || 'Failed to load product');
        } else if (result.data?.shopProduct) {
          const p = result.data.shopProduct;
          setProduct(p);

          // Auto-select first available size and color
          const sizes = [...new Set(p.variants.map((v: ShopVariant) => v.size).filter(Boolean))];
          const colors = [...new Set(p.variants.map((v: ShopVariant) => v.color).filter(Boolean))];
          if (sizes.length > 0) setSelectedSize(sizes[0] as string);
          if (colors.length > 0) setSelectedColor(colors[0] as string);
        } else {
          setError('Product not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  // Extract unique sizes and colors
  const sizes = useMemo(() => {
    if (!product) return [];
    return [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[];
  }, [product]);

  const colors = useMemo(() => {
    if (!product) return [];
    const colorMap = new Map<string, string | undefined>();
    product.variants.forEach((v) => {
      if (v.color && !colorMap.has(v.color)) {
        colorMap.set(v.color, v.colorHex);
      }
    });
    return Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
  }, [product]);

  // Find the selected variant
  const selectedVariant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => {
      const sizeMatch = !selectedSize || v.size === selectedSize;
      const colorMatch = !selectedColor || v.color === selectedColor;
      return sizeMatch && colorMatch;
    }) || null;
  }, [product, selectedSize, selectedColor]);

  // Get current display price
  const displayPrice = useMemo(() => {
    if (!product) return null;
    if (product.retailPriceCents) return formatPrice(product.retailPriceCents);
    if (selectedVariant?.retailPriceCents) return formatPrice(selectedVariant.retailPriceCents);
    return 'Price TBD';
  }, [product, selectedVariant]);

  // Get display image
  const displayImage = selectedVariant?.thumbnailUrl || product?.thumbnailUrl;

  if (loading) {
    return (
      <div>
        <Link to="/shop" className="text-primary-600 hover:text-primary-700 font-medium mb-6 inline-block">
          &larr; Back to Shop
        </Link>
        <div className="grid md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-lg" />
          <div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Link to="/shop" className="text-primary-600 hover:text-primary-700 font-medium mb-6 inline-block">
          &larr; Back to Shop
        </Link>
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔍</span>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {error || 'Product not found'}
          </h2>
          <Link to="/shop" className="btn-primary mt-4 inline-block">
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <Link to="/shop" className="text-primary-600 hover:text-primary-700 font-medium mb-6 inline-block">
        &larr; Back to Shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-6xl" aria-hidden="true">👕</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>

          <p className="text-2xl font-bold text-gray-800 mb-4">
            {displayPrice}
          </p>

          {product.description && (
            <p className="text-gray-600 mb-6">{product.description}</p>
          )}

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const isAvailable = product.variants.some(
                    (v) => v.size === size && v.inStock && (!selectedColor || v.color === selectedColor)
                  );
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={!isAvailable}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                        ${selectedSize === size
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : isAvailable
                            ? 'border-gray-300 text-gray-700 hover:border-gray-400'
                            : 'border-gray-200 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color{selectedColor ? `: ${selectedColor}` : ''}
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map(({ name, hex }) => {
                  const isAvailable = product.variants.some(
                    (v) => v.color === name && v.inStock && (!selectedSize || v.size === selectedSize)
                  );
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedColor(name)}
                      disabled={!isAvailable}
                      title={name}
                      className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center
                        ${selectedColor === name
                          ? 'border-primary-500 ring-2 ring-primary-300'
                          : isAvailable
                            ? 'border-gray-300 hover:border-gray-400'
                            : 'border-gray-200 opacity-40 cursor-not-allowed'
                        }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full"
                        style={{ backgroundColor: hex || '#ccc' }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="input w-16 text-center"
              />
              <button
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >
                +
              </button>
            </div>
          </div>

          {/* Stock status */}
          {selectedVariant && !selectedVariant.inStock && (
            <p className="text-red-600 text-sm mb-4">This variant is currently out of stock.</p>
          )}

          {/* Add to Cart */}
          <button
            onClick={() => {
              if (!product || !selectedVariant) return;
              const price = product.retailPriceCents || selectedVariant.retailPriceCents || 0;
              addItem({
                printfulVariantId: selectedVariant.variantId,
                printfulProductId: product.printfulId,
                productName: product.name,
                variantName: selectedVariant.name,
                size: selectedVariant.size,
                color: selectedVariant.color,
                quantity,
                unitPriceCents: price,
                thumbnailUrl: selectedVariant.thumbnailUrl || product.thumbnailUrl,
              });
              setAddedToCart(true);
              openDrawer();
              setTimeout(() => setAddedToCart(false), 2000);
            }}
            disabled={!selectedVariant || !selectedVariant.inStock}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition-colors ${
              addedToCart
                ? 'bg-green-600 text-white'
                : !selectedVariant || !selectedVariant.inStock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {addedToCart ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
