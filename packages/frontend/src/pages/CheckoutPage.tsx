import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, CartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function lineSummary(item: CartItem): string {
  const base = [item.color, item.size].filter(Boolean).join(' · ') || item.itemType;
  const decos = item.decorations.map((d) => (d.text ? `${d.label}: “${d.text}”` : d.label));
  return [base, ...decos].join(' · ');
}

const CREATE_ORDER = `mutation($input: CreateCatalogOrderInput!) {
  createCatalogOrder(input: $input) { confirmationCode }
}`;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotalCents, clearCart } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      const res = await authFetch(CREATE_ORDER, {
        input: {
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            itemType: i.itemType,
            color: i.color,
            size: i.size,
            decorations: i.decorations.map((d) => ({
              label: d.label,
              text: d.text,
              placement: d.placement,
              priceCents: d.priceCents,
            })),
            unitPriceCents: i.unitPriceCents,
            quantity: i.quantity,
          })),
        },
      });
      if (res.errors) {
        setError(res.errors[0]?.message || 'Failed to place your order');
        return;
      }
      const code = res.data?.createCatalogOrder?.confirmationCode;
      clearCart();
      navigate(`/shop/order-confirmation?code=${code}`);
    } catch {
      setError('Failed to place your order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link to="/shop/cart" className="text-primary-600 hover:text-primary-700 text-sm">&larr; Back to Cart</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 mb-6">Checkout</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-6">Your cart is empty.</p>
          <Link to="/shop" className="btn-primary inline-block">Browse Shop</Link>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Order summary</h2>
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.lineId} className="py-3 flex justify-between gap-4 text-sm">
                  <span className="text-gray-700">
                    {item.quantity}× {item.productName}
                    <span className="block text-gray-500">{lineSummary(item)}</span>
                  </span>
                  <span className="font-medium text-gray-900 whitespace-nowrap">
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold text-gray-900 border-t pt-3 mt-1">
              <span>Total</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Items are produced with the club's next bulk order and <strong>handed out at a meeting</strong>.
            Payment is collected at pickup.
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mt-4 text-sm">{error}</div>}

          <div className="mt-6">
            {isLoading ? (
              <p className="text-gray-500 text-sm">Checking your account…</p>
            ) : isAuthenticated ? (
              <button onClick={placeOrder} disabled={placing} className="btn-primary w-full sm:w-auto">
                {placing ? 'Placing order…' : 'Place Order'}
              </button>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-gray-700 mb-3">Please log in to place your order.</p>
                <Link to="/login" className="btn-primary inline-block">Log In</Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
