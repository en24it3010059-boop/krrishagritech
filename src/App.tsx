import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppShell, { type PageKey } from '@/components/AppShell';
import { LoadingState } from '@/components/ui';
import { useCart, type Cart } from '@/hooks/useCart';
import AuthPage from '@/pages/AuthPage';
import OverviewPage from '@/pages/OverviewPage';
import FarmPage from '@/pages/FarmPage';
import CropsPage from '@/pages/CropsPage';
import WeatherPage from '@/pages/WeatherPage';
import StorePage from '@/pages/StorePage';
import OrdersPage from '@/pages/OrdersPage';
import AdminPage from '@/pages/AdminPage';

function PageContent({
  page,
  onNavigate,
  onOrderPlaced,
  cart,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  onOrderPlaced: () => void;
  cart: Cart;
}) {
  switch (page) {
    case 'overview':
      return <OverviewPage onNavigate={onNavigate} />;
    case 'farm':
      return <FarmPage />;
    case 'crops':
      return <CropsPage />;
    case 'weather':
      return <WeatherPage onNavigate={onNavigate} />;
    case 'store':
      return <StorePage cart={cart} onOrderPlaced={onOrderPlaced} />;
    case 'orders':
      return <OrdersPage />;
    case 'admin':
      return <AdminPage />;
  }
}

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [page, setPage] = useState<PageKey>('overview');
  const cart = useCart();

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-50">
        <LoadingState label="Loading AgriTech..." />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const activePage: PageKey = page === 'admin' && !isAdmin ? 'overview' : page;

  return (
    <AppShell page={activePage} onNavigate={setPage} cartCount={cart.count}>
      <PageContent
        page={activePage}
        onNavigate={setPage}
        cart={cart}
        onOrderPlaced={() => {
          cart.clear();
          setPage('orders');
        }}
      />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
