import { Link } from 'react-router-dom';
import { useCart, CartItem } from '../context/CartContext';

// Interim checkout for Phase A3. Order collection (login-gated, pay-now /
// pay-at-pickup) lands in Phase A4 — this page reviews the cart in the
// meantime so the flow stays coherent after the Printful pivot.

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function lineSummary(item: CartItem): string {
  const base = [item.color, item.size].filter(Boolean).join(' · ') || item.itemType;
  const decos = item.decorations.map((d) => (d.text ? `${d.label}: “${d.text}”` : d.label));
  return [base, ...decos].join(' · ');
}

export default function CheckoutPage() {
  const { items, subtotalCents } = useCart();

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
              <span>Subtotal</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Ordering is almost ready.</strong> Placing orders (with pay-now or
            pay-at-pickup) is coming in the next update. Items will be produced with the
            club's next bulk order and handed out at a meeting.
          </div>
        </>
      )}
    </div>
  );
}
