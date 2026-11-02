import { useCallback, useEffect, useState } from 'react';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getErrorMessage } from '@/lib/format';
import type { OrderStatus, Role } from '@/lib/types';
import { Card, InlineAlert, PageHeader } from '@/components/ui';

type AdminTab = 'orders' | 'products';

interface AdminStats {
  farmers: number;
  openOrders: number;
  revenueCents: number;
  activeProducts: number;
}

const OPEN_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped'];

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-earth-600">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-earth-900">{value}</p>
    </Card>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('orders');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const [profilesResult, ordersResult, productsResult] = await Promise.all([
      supabase.from('profiles').select('role'),
      supabase.from('orders').select('status, total_cents'),
      supabase.from('products').select('id').eq('is_active', true),
    ]);
    if (profilesResult.error || ordersResult.error || productsResult.error) {
      setStatsError(getErrorMessage(profilesResult.error ?? ordersResult.error ?? productsResult.error));
      return;
    }
    setStatsError(null);

    const profiles = (profilesResult.data as { role: Role }[]) ?? [];
    const orders = (ordersResult.data as { status: OrderStatus; total_cents: number }[]) ?? [];
    setStats({
      farmers: profiles.filter((profile) => profile.role === 'farmer').length,
      openOrders: orders.filter((order) => OPEN_STATUSES.includes(order.status)).length,
      revenueCents: orders
        .filter((order) => order.status !== 'cancelled')
        .reduce((total, order) => total + order.total_cents, 0),
      activeProducts: (productsResult.data ?? []).length,
    });
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <>
      <PageHeader title="Admin dashboard" description="Manage incoming orders and the resources sold in the store." />

      {statsError && (
        <div className="mb-6">
          <InlineAlert tone="error">{statsError}</InlineAlert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="Farmers" value={stats ? String(stats.farmers) : '-'} />
        <StatTile label="Open orders" value={stats ? String(stats.openOrders) : '-'} />
        <StatTile label="Revenue (excl. cancelled)" value={stats ? formatCurrency(stats.revenueCents) : '-'} />
        <StatTile label="Active products" value={stats ? String(stats.activeProducts) : '-'} />
      </div>

      <div className="mt-8 flex gap-1 rounded-xl bg-earth-100 p-1 sm:inline-flex" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 rounded-lg px-5 py-2 text-sm font-semibold transition sm:flex-none ${
              tab === item.key ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-600 hover:text-earth-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'orders' ? <AdminOrders onChanged={() => void loadStats()} /> : <AdminProducts onChanged={() => void loadStats()} />}
      </div>
    </>
  );
}
