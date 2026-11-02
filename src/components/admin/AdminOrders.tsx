import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/labels';
import type { Order, OrderStatus, Profile } from '@/lib/types';
import { Card, EmptyState, InlineAlert, LoadingState, inputClass } from '@/components/ui';

interface AdminOrdersProps {
  onChanged: () => void;
}

export function AdminOrders({ onChanged }: AdminOrdersProps) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [ordersResult, profilesResult] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name'),
      ]);
      if (cancelled) return;
      if (ordersResult.error || profilesResult.error) {
        setError(getErrorMessage(ordersResult.error ?? profilesResult.error));
        return;
      }
      setOrders((ordersResult.data as Order[]) ?? []);
      const names: Record<string, string> = {};
      for (const profile of (profilesResult.data as Pick<Profile, 'id' | 'full_name'>[]) ?? []) {
        names[profile.id] = profile.full_name || 'Unnamed farmer';
      }
      setCustomerNames(names);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('id, status')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('This order could not be updated. Refresh the page and try again.');
      setOrders((previous) => previous?.map((order) => (order.id === orderId ? { ...order, status } : order)) ?? null);
      onChanged();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setUpdatingId(null);
    }
  };

  if (!orders && !error) return <LoadingState label="Loading orders..." />;

  const visible = (orders ?? []).filter((order) => filter === 'all' || order.status === filter);

  return (
    <div className="space-y-5">
      {error && <InlineAlert tone="error">{error}</InlineAlert>}

      {orders && orders.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="order-filter" className="text-sm font-medium text-earth-700">
            Show orders
          </label>
          <select
            id="order-filter"
            className={`${inputClass} sm:w-56`}
            value={filter}
            onChange={(event) => setFilter(event.target.value as OrderStatus | 'all')}
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {orders && orders.length === 0 && (
        <EmptyState icon={ClipboardList} title="No orders yet" description="Orders from farmers will appear here as soon as they check out." />
      )}

      {visible.map((order) => {
        const itemCount = order.order_items.reduce((total, item) => total + item.quantity, 0);
        return (
          <Card key={order.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-display text-base font-semibold text-earth-900">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-sm text-earth-600">
                  {customerNames[order.user_id] ?? 'Unknown farmer'} · {formatDate(order.created_at)} · {itemCount}{' '}
                  {itemCount === 1 ? 'item' : 'items'}
                </p>
                <p className="text-sm text-earth-500">
                  {order.order_items.map((item) => `${item.product_name} × ${item.quantity}`).join(', ')}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                <p className="font-display text-lg font-bold text-earth-900">{formatCurrency(order.total_cents)}</p>
                <label className="sr-only" htmlFor={`status-${order.id}`}>
                  Order status
                </label>
                <select
                  id={`status-${order.id}`}
                  className={`${inputClass} sm:w-44 lg:w-44`}
                  value={order.status}
                  disabled={updatingId === order.id}
                  onChange={(event) => void changeStatus(order.id, event.target.value as OrderStatus)}
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
