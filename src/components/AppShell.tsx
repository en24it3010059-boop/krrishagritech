import { useState, type ReactNode } from 'react';
import {
  CloudSun,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/format';
import { InlineAlert } from '@/components/ui';

export type PageKey = 'overview' | 'farm' | 'crops' | 'weather' | 'store' | 'orders' | 'admin';

const NAV_ITEMS: { key: PageKey; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'farm', label: 'My Farm', icon: MapPin },
  { key: 'crops', label: 'Crops', icon: Wheat },
  { key: 'weather', label: 'Weather & Alerts', icon: CloudSun },
  { key: 'store', label: 'Resource Store', icon: ShoppingBag },
  { key: 'orders', label: 'My Orders', icon: Package },
  { key: 'admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
];

interface AppShellProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  cartCount: number;
  children: ReactNode;
}

export default function AppShell({ page, onNavigate, cartCount, children }: AppShellProps) {
  const { profile, user, isAdmin, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const displayName = profile?.full_name || user?.email || 'Farmer';

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (caught) {
      setSignOutError(getErrorMessage(caught));
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 lg:flex">
      <aside className="border-b border-earth-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-display text-lg font-bold text-earth-900">AgriTech</span>
        </div>

        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {items.map((item) => {
            const active = page === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? 'bg-primary-50 text-primary-800'
                    : 'text-earth-700 hover:bg-earth-100 hover:text-earth-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-primary-600' : 'text-earth-500'}`} aria-hidden="true" />
                <span>{item.label}</span>
                {item.key === 'store' && cartCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-earth-200 px-5 py-3 lg:mt-auto lg:py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-earth-900">{displayName}</p>
            <p className="text-xs text-earth-500">{isAdmin ? 'Administrator' : 'Farmer'}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-earth-500 transition hover:bg-earth-100 hover:text-earth-900 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {signOutError && (
          <div className="px-5 pb-4">
            <InlineAlert tone="error">{signOutError}</InlineAlert>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
