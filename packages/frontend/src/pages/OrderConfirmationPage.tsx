import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { authFetch } from '../utils/authFetch';

interface OrderData {
  confirmationCode: string;
  status: string;
  buyerEmail: string;
  buyerName: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}

const ORDER_QUERY = `
  query OrderStatus($confirmationCode: String!) {
    orderStatus(confirmationCode: $confirmationCode) {
      confirmationCode status buyerEmail buyerName
      subtotalCents shippingCents totalCents
      items { productName variantName quantity unitPriceCents }
    }
  }
`;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const { clearCart } = useCart();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadOrder() {
      if (!code) {
        setError('No confirmation code provided');
        setLoading(false);
        return;
      }

      try {
        const result = await authFetch(ORDER_QUERY, { confirmationCode: code });
        if (result.errors) {
          setError(result.errors[0]?.message || 'Failed to load order');
        } else if (result.data?.orderStatus) {
          setOrder(result.data.orderStatus);
        } else {
          setError('Order not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [code]);

  if (loading) {
    return (
      <div className="text-center py-16 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto mb-4" />
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4" />
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl mb-4 block" aria-hidden="true">😕</span>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          {error || 'Order not found'}
        </h2>
        <Link to="/shop" className="btn-primary mt-4 inline-block">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600">Thank you for your purchase, {order.buyerName}.</p>
      </div>

      {/* Confirmation code */}
      <div className="bg-gray-50 rounded-lg p-6 text-center mb-8">
        <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
        <p className="text-2xl font-mono font-bold text-gray-900">{order.confirmationCode}</p>
        <p className="text-sm text-gray-500 mt-2">
          Save this code to check your order status.
        </p>
      </div>

      {/* Order items */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
        <ul className="divide-y">
          {order.items.map((item, i) => (
            <li key={i} className="py-3 flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                <p className="text-xs text-gray-500">{item.variantName} x {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatPrice(item.unitPriceCents * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatPrice(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span>{formatPrice(order.shippingCents)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t pt-2">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <p className="text-sm text-blue-800">
          You'll receive tracking information at <strong>{order.buyerEmail}</strong> once your order ships.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/shop/order-status"
          className="flex-1 text-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          Track Order
        </Link>
        <Link
          to="/shop"
          className="flex-1 text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
