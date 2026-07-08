import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

interface OrderItem {
  productName: string;
  itemType: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPriceCents: number;
  decorations: Array<{ label: string; text?: string }>;
}

interface OrderData {
  confirmationCode: string;
  status: string;
  paymentStatus: string;
  buyerName: string;
  subtotalCents: number;
  createdAt: string;
  items: OrderItem[];
}

const ORDER_QUERY = `query CatalogOrderStatus($confirmationCode: String!) {
  catalogOrderStatus(confirmationCode: $confirmationCode) {
    confirmationCode status paymentStatus buyerName subtotalCents createdAt
    items { productName itemType color size quantity unitPriceCents decorations { label text } }
  }
}`;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Collected — awaiting club order', color: 'bg-yellow-100 text-yellow-800' },
  SUBMITTED: { label: 'Submitted to printer', color: 'bg-blue-100 text-blue-800' },
  IN_PRODUCTION: { label: 'In production', color: 'bg-indigo-100 text-indigo-800' },
  RECEIVED: { label: 'Received — ready for pickup', color: 'bg-green-100 text-green-800' },
  DISTRIBUTED: { label: 'Handed out', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  UNPAID: { label: 'Pay at pickup', color: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  CREDITED: { label: 'Club credit', color: 'bg-blue-100 text-blue-800' },
};

function itemLine(item: OrderItem): string {
  const base = [item.color, item.size].filter(Boolean).join(' · ') || item.itemType;
  const decos = item.decorations.map((d) => (d.text ? `${d.label}: “${d.text}”` : d.label));
  return [base, ...decos].join(' · ');
}

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
      const result = await authFetch(ORDER_QUERY, { confirmationCode: code.trim().toUpperCase() });
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to look up order');
      } else if (result.data?.catalogOrderStatus) {
        setOrder(result.data.catalogOrderStatus);
      } else {
        setError('Order not found. Please check the confirmation code.');
      }
    } catch {
      setError('Failed to look up order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) handleLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusConfig = order ? STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' } : null;
  const paymentConfig = order ? PAYMENT_CONFIG[order.paymentStatus] : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/shop" className="text-primary-600 hover:text-primary-700 font-medium mb-6 inline-block">
        &larr; Back to Shop
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Order Status</h1>

      <form onSubmit={handleLookup} className="flex gap-3 mb-8">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter confirmation code (e.g. BCS-A7K2M3)"
          className="input flex-1"
        />
        <button type="submit" disabled={loading || !code.trim()} className="btn-primary whitespace-nowrap">
          {loading ? 'Looking up...' : 'Look Up'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {searched && !loading && !order && !error && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔍</span>
          <p className="text-gray-500">No order found with that code.</p>
        </div>
      )}

      {order && (
        <div>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <p className="text-sm text-gray-500">Confirmation Code</p>
              <p className="text-xl font-mono font-bold">{order.confirmationCode}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig?.color}`}>
                {statusConfig?.label}
              </span>
              {paymentConfig && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}>
                  {paymentConfig.label}
                </span>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Order Details</h2>
              <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <ul className="divide-y">
              {order.items.map((item, i) => (
                <li key={i} className="py-3 flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.quantity}× {item.productName}</p>
                    <p className="text-xs text-gray-500">{itemLine(item)}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-base font-semibold border-t mt-3 pt-3">
              <span>Total</span>
              <span>{formatPrice(order.subtotalCents)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
