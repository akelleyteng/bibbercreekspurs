import { Link } from 'react-router-dom';
import { useCart, CartItem } from '../context/CartContext';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function itemSummary(item: CartItem): string {
  return [item.color, item.size].filter(Boolean).join(' · ') || item.itemType;
}

function Decorations({ item }: { item: CartItem }) {
  if (item.decorations.length === 0) return null;
  return (
    <ul className="text-xs text-gray-500 mt-0.5">
      {item.decorations.map((d, i) => (
        <li key={i}>+ {d.label}{d.text ? `: “${d.text}”` : ''}</li>
      ))}
    </ul>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotalCents, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Your Cart</h1>
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block" aria-hidden="true">🛒</span>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Browse our shop to find club gear!</p>
          <Link to="/shop" className="btn-primary inline-block">Browse Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Cart</h1>
        <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700">Clear Cart</button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Quantity</th>
              <th className="pb-3 font-medium text-right">Total</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.lineId}>
                <td className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 flex-shrink-0 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl" aria-hidden="true">👕</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">{itemSummary(item)}</p>
                      <Decorations item={item} />
                    </div>
                  </div>
                </td>
                <td className="py-4 text-gray-700">{formatPrice(item.unitPriceCents)}</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.lineId, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40">-</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.lineId, item.quantity + 1)} className="w-8 h-8 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">+</button>
                  </div>
                </td>
                <td className="py-4 text-right font-medium text-gray-900">{formatPrice(item.unitPriceCents * item.quantity)}</td>
                <td className="py-4 text-right">
                  <button onClick={() => removeItem(item.lineId)} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-4">
        {items.map((item) => (
          <div key={item.lineId} className="border rounded-lg p-4 flex gap-4">
            <div className="h-20 w-20 flex-shrink-0 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl" aria-hidden="true">👕</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{item.productName}</p>
              <p className="text-sm text-gray-500">{itemSummary(item)}</p>
              <Decorations item={item} />
              <p className="text-sm font-medium mt-1">{formatPrice(item.unitPriceCents)}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.lineId, item.quantity - 1)} disabled={item.quantity <= 1} className="w-7 h-7 rounded border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-40">-</button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.lineId, item.quantity + 1)} className="w-7 h-7 rounded border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">+</button>
                </div>
                <button onClick={() => removeItem(item.lineId)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between text-lg font-semibold text-gray-900 mb-2">
          <span>Subtotal</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
        <p className="text-sm text-gray-500 mb-6">Items are handed out at a club meeting — no shipping.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/shop/checkout" className="flex-1 text-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors">
            Proceed to Checkout
          </Link>
          <Link to="/shop" className="flex-1 text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
