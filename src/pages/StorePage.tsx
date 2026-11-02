import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import type { Cart } from '@/hooks/useCart';
import type { Product } from '@/lib/types';
import { Button, EmptyState, InlineAlert, PageHeader } from '@/components/ui';
import { CartDrawer } from '@/components/CartDrawer';
import { ProductCard } from '@/components/ProductCard';

const ALL_CATEGORIES = 'All';

export default function StorePage({ cart, onOrderPlaced }: { cart: Cart; onOrderPlaced: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [cartOpen, setCartOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('name');
    if (error) {
      setLoadError(getErrorMessage(error));
      return;
    }
    setLoadError(null);
    setProducts((data as Product[]) ?? []);
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...Array.from(new Set((products ?? []).map((product) => product.category))).sort()],
    [products],
  );
  const visibleProducts = (products ?? []).filter((product) => category === ALL_CATEGORIES || product.category === category);

  return (
    <>
      <PageHeader
        title="Resource store"
        description="Seeds, fertiliser, irrigation and soil tools, delivered to your farm."
        actions={
          <Button variant="secondary" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Cart
            {cart.count > 0 && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">{cart.count}</span>
            )}
          </Button>
        }
      />

      {loadError && (
        <div className="mb-6">
          <InlineAlert tone="error">{loadError}</InlineAlert>
        </div>
      )}

      {products && products.length > 0 && (
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                category === value
                  ? 'bg-earth-900 text-white shadow-sm'
                  : 'bg-white text-earth-700 ring-1 ring-earth-200 hover:bg-earth-100'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {!products && !loadError && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-earth-200/70" />
          ))}
        </div>
      )}

      {products && products.length === 0 && (
        <EmptyState icon={Store} title="The store is empty" description="New resources will appear here as they become available." />
      )}

      {products && products.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} cart={cart} />
          ))}
        </div>
      )}

      {cartOpen && products && (
        <CartDrawer
          cart={cart}
          products={products}
          onClose={() => setCartOpen(false)}
          onOrderPlaced={() => {
            setCartOpen(false);
            onOrderPlaced();
          }}
          onInventoryChanged={() => void loadProducts()}
        />
      )}
    </>
  );
}
