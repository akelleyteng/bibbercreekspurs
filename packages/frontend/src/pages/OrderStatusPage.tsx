import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

interface OrderData {
  confirmationCode: string;
  status: string;
  buyerName: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  createdAt: string;
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
      confirmationCode status buyerName
      subtotalCents shippingCents totalCents
      trackingNumber trackingUrl carrier createdAt
      items { productName variantName quantity unitPriceCents }
    }
  }
`;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Payment Pending', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  SUBMITTED: { label: 'Submitted to Printer', color: 'bg-blue-100 text-blue-800' },
  PROCESSING: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800' },
  SHIPPED: { label: 'Shipped', color: 'bg-green-100 text-green-800' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800' },
};

export default function OrderStatusPage() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);
    setSearched(true);

    try {
      const result = await authFetch(ORDER_QUERY, {
        confirmationCode: code.trim().toUpperCase(),
      });

      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to look up order');
      } else if (result.data?.orderStatus) {
        setOrder(result.data.orderStatus);
      } else {
        setError('Order not found. Please check the confirmation code.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to look up order');
    } finally {
      setLoading(false);
    }
  };

  // Auto-lookup if code provided in URL
  useEffect(() => {
    if (initialCode) {
      handleLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusConfig = order ? STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' } : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/shop" className="text-primary-600 hover:text-primary-700 font-medium mb-6 inline-block">
        &larr; Back to Shop
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Order Status</h1>

      {/* Lookup form */}
      <form onSubmit={handleLookup} className="flex gap-3 mb-8">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter confirmation code (e.g. BCS-A7K2M3)"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="btn-primary whitespace-nowrap"
        >
          {loading ? 'Looking up...' : 'Look Up'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {searched && !loading && !order && !error && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔍</span>
          <p className="text-gray-500">No order found with that code.</p>
        </div>
      )}

      {order && (
        <div>
          {/* Status badge */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Confirmation Code</p>
              <p className="text-xl font-mono font-bold">{order.confirmationCode}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig?.color}`}>
              {statusConfig?.label}
            </span>
          </div>

          {/* Tracking info */}
          {order.trackingNumber && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-green-800 mb-1">
                {order.carrier ? `Shipped via ${order.carrier}` : 'Shipped'}
              </p>
              <p className="text-sm text-green-700">
                Tracking: {order.trackingUrl ? (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    {order.trackingNumber}
                  </a>
                ) : (
                  <span className="font-mono">{order.trackingNumber}</span>
                )}
              </p>
            </div>
          )}

          {/* Order items */}
          <div className="border rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Order Details</h2>
              <p className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
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
        </div>
      )}
    </div>
  );
}
