import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { ORDER_STATUSES } from '@/lib/labels';
import { Badge, Card, EmptyState, InlineAlert, LoadingState, PageHeader } from '@/components/ui';

const STATUS_TONES: Record<OrderStatus, 'amber' | 'sky' | 'green' | 'red'> = {
  pending: 'amber',
  confirmed: 'sky',
  shipped: 'sky',
  delivered: 'green',
  cancelled: 'red',
};

function OrderCard({ order }: { order: Order }) {
  const statusLabel = ORDER_STATUSES.find((status) => status.value === order.status)?.label ?? order.status;
  const itemCount = order.order_items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-earth-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-semibold text-earth-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm text-earth-500">
            {formatDate(order.created_at)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Badge tone={STATUS_TONES[order.status]}>{statusLabel}</Badge>
      </div>

      <ul className="divide-y divide-earth-100">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <span className="text-earth-800">
              {item.product_name} <span className="text-earth-500">× {item.quantity}</span>
            </span>
            <span className="font-medium text-earth-900">{formatCurrency(item.unit_price_cents * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-earth-100 pt-4">
        <span className="text-sm font-medium text-earth-600">Total</span>
        <span className="font-display text-lg font-bold text-earth-900">{formatCurrency(order.total_cents)}</span>
      </div>
    </Card>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error: loadError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (loadError) {
        setError(getErrorMessage(loadError));
        return;
      }
      setOrders((data as Order[]) ?? []);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader title="My orders" description="Everything you have ordered from the resource store." />

      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {!orders && !error && <LoadingState label="Loading your orders..." />}

      {orders && orders.length === 0 && (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you order seeds, fertiliser or equipment from the store, they will show up here."
        />
      )}

      {orders && orders.length > 0 && <div className="space-y-5">{orders.map((order) => <OrderCard key={order.id} order={order} />)}</div>}
    </>
  );
}
