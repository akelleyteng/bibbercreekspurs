import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/authFetch';

interface OrderItem {
  productName: string;
  itemType: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  unitPriceCents: number;
  decorations: Array<{ label: string; text?: string | null; placement?: string | null }>;
}

interface Order {
  id: string;
  confirmationCode: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUSES = ['PENDING', 'SUBMITTED', 'IN_PRODUCTION', 'RECEIVED', 'DISTRIBUTED', 'CANCELLED'];
const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'CREDITED'];

const ORDERS_QUERY = `query {
  adminCatalogOrders {
    id confirmationCode buyerName buyerEmail status paymentStatus subtotalCents createdAt
    items { productName itemType color size quantity unitPriceCents decorations { label text placement } }
  }
}`;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function decoSummary(item: OrderItem): string {
  return item.decorations.map((d) => (d.text ? `${d.label}: ${d.text}` : d.label)).join('; ');
}

// ── CSV export (client-side) ──

function csvCell(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(orders: Order[]): string {
  const header = ['Confirmation', 'Buyer', 'Product', 'Brand/Style', 'Type', 'Color', 'Size', 'Decorations', 'Qty', 'Unit Price'];
  const rows: (string | number)[][] = [header];
  for (const o of orders) {
    for (const it of o.items) {
      rows.push([
        o.confirmationCode,
        o.buyerName,
        it.productName,
        '', // brand/style not snapshotted on the line item; admin can fill from the catalog
        it.itemType,
        it.color || '',
        it.size || '',
        decoSummary(it),
        it.quantity,
        money(it.unitPriceCents),
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminShopOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(ORDERS_QUERY);
      if (res.errors) {
        setError(res.errors[0]?.message || 'Failed to load orders');
        return;
      }
      setOrders(res.data?.adminCatalogOrders || []);
    } catch {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrder = async (id: string, field: 'status' | 'paymentStatus', value: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($id: String!, $status: String, $paymentStatus: String) {
        updateCatalogOrder(id: $id, status: $status, paymentStatus: $paymentStatus) { id }
      }`,
      { id, status: field === 'status' ? value : undefined, paymentStatus: field === 'paymentStatus' ? value : undefined }
    );
    if (res.errors) {
      setError(res.errors[0]?.message || 'Failed to update order');
      return;
    }
    await fetchOrders();
  };

  const visible = orders.filter((o) => statusFilter === 'ALL' || o.status === statusFilter);
  const amountOwed = visible
    .filter((o) => o.paymentStatus === 'UNPAID')
    .reduce((sum, o) => sum + o.subtotalCents, 0);

  if (loading) return <p className="text-gray-500 py-8">Loading orders…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Apparel Orders</h2>
          <p className="text-sm text-gray-500">
            {visible.length} order{visible.length === 1 ? '' : 's'}
            {amountOwed > 0 && <> · {money(amountOwed)} unpaid (collect at pickup)</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            className="btn-primary text-sm"
            disabled={visible.length === 0}
            onClick={() => downloadCsv(`bibber-shop-orders.csv`, buildCsv(visible))}
          >
            Download order sheet (CSV)
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {visible.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No orders{statusFilter !== 'ALL' ? ' with this status' : ' yet'}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((o) => (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold text-gray-900">{o.confirmationCode}</p>
                  <p className="text-sm text-gray-600">{o.buyerName} · {o.buyerEmail}</p>
                  <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="input text-sm" value={o.status} onChange={(e) => updateOrder(o.id, 'status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="input text-sm" value={o.paymentStatus} onChange={(e) => updateOrder(o.id, 'paymentStatus', e.target.value)}>
                    {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <ul className="mt-3 border-t pt-3 space-y-1 text-sm">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span className="text-gray-700">
                      {it.quantity}× {it.productName}
                      <span className="text-gray-500"> — {[it.color, it.size].filter(Boolean).join(' · ')}{decoSummary(it) ? ` · ${decoSummary(it)}` : ''}</span>
                    </span>
                    <span className="text-gray-900 whitespace-nowrap">{money(it.unitPriceCents * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-medium text-gray-900 border-t mt-2 pt-2 text-sm">
                <span>Total</span>
                <span>{money(o.subtotalCents)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
