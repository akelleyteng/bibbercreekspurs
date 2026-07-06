import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

interface CatalogListProduct {
  id: string;
  itemType: string;
  name: string;
  brandStyle?: string | null;
  imageUrl?: string | null;
  blankCostCents: number;
}

const SHOP_QUERY = `query {
  catalogProducts { id itemType name brandStyle imageUrl blankCostCents }
}`;

const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

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
  const [products, setProducts] = useState<CatalogListProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(SHOP_QUERY);
      if (res.errors) {
        setError(res.errors[0]?.message || 'Failed to load the shop');
        return;
      }
      setProducts(res.data?.catalogProducts || []);
    } catch {
      setError('Failed to load the shop');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Club Shop</h1>
        <p className="text-gray-600">
          Custom Bibber Creek Spurs apparel — order year-round; items are handed out at a club meeting.
        </p>
      </div>

      {loading && (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchProducts} className="btn-primary">Try Again</button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block" aria-hidden="true">🤠</span>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Check back soon — club gear is coming!</h2>
          <p className="text-gray-500">We're putting the finishing touches on our club apparel collection.</p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/shop/${p.id}`}
              className="card group hover:shadow-lg transition-shadow duration-200 flex flex-col"
            >
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-4xl" aria-hidden="true">👕</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1 line-clamp-2">
                {p.name}
              </h3>
              <p className="text-sm text-gray-500">{p.itemType}{p.brandStyle ? ` · ${p.brandStyle}` : ''}</p>
              <p className="text-lg font-bold text-gray-800 mt-auto pt-2">From {formatPrice(p.blankCostCents)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
