import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { authFetch } from '../utils/authFetch';

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

const SHOP_PRODUCTS_QUERY = `
  query {
    shopProducts {
      id printfulId name description thumbnailUrl retailPriceCents creditEligible
      variants { variantId name size color colorHex thumbnailUrl inStock retailPriceCents }
    }
  }
`;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getPriceDisplay(product: ShopProduct): string {
  if (product.retailPriceCents) {
    return formatPrice(product.retailPriceCents);
  }

  // Fall back to variant prices
  const variantPrices = product.variants
    .map((v) => v.retailPriceCents)
    .filter((p): p is number => p != null);

  if (variantPrices.length === 0) return 'Price TBD';

  const min = Math.min(...variantPrices);
  const max = Math.max(...variantPrices);

  if (min === max) return formatPrice(min);
  return `From ${formatPrice(min)}`;
}

function ProductCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/4" />
    </div>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const result = await authFetch(SHOP_PRODUCTS_QUERY);
        if (result.errors) {
          setError(result.errors[0]?.message || 'Failed to load products');
        } else if (result.data?.shopProducts) {
          setProducts(result.data.shopProducts);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Club Shop</h1>
        <p className="text-gray-600">
          Show your Bibber Creek Spurs pride with official club gear!
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block" aria-hidden="true">🤠</span>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Check back soon — club gear is coming!
          </h2>
          <p className="text-gray-500">
            We're putting the finishing touches on our club apparel collection.
          </p>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/shop/${product.printfulId}`}
              className="card group hover:shadow-lg transition-shadow duration-200"
            >
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl" aria-hidden="true">👕</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1 line-clamp-2">
                {product.name}
              </h3>
              <p className="text-lg font-bold text-gray-800">
                {getPriceDisplay(product)}
              </p>

              {/* Available sizes hint */}
              {product.variants.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))];
                    if (sizes.length === 0) return null;
                    return `${sizes.length} size${sizes.length > 1 ? 's' : ''} available`;
                  })()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
