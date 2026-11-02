import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getErrorMessage } from '@/lib/format';
import type { Cart } from '@/hooks/useCart';
import type { Product } from '@/lib/types';
import { Button, InlineAlert } from '@/components/ui';

interface CartDrawerProps {
  cart: Cart;
  products: Product[];
  onClose: () => void;
  onOrderPlaced: () => void;
  onInventoryChanged: () => void;
}

export function CartDrawer({ cart, products, onClose, onOrderPlaced, onInventoryChanged }: CartDrawerProps) {
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const items = cart.lines.flatMap((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return product ? [{ product, quantity: Math.min(line.quantity, product.stock) }] : [];
  });
  const subtotal = items.reduce((total, item) => total + item.product.price_cents * item.quantity, 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setPlacing(true);
    setError(null);
    try {
      const { error: orderError } = await supabase.rpc('place_order', {
        p_items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      if (orderError) throw orderError;
      onOrderPlaced();
    } catch (caught) {
      setError(getErrorMessage(caught));
      onInventoryChanged();
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-earth-950/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl animate-fade-up"
      >
        <div className="flex items-center justify-between border-b border-earth-100 px-6 py-5">
          <h2 id="cart-title" className="font-display text-lg font-semibold text-earth-900">
            Your cart
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-lg p-1.5 text-earth-500 transition hover:bg-earth-100 hover:text-earth-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-earth-600">
            Your cart is empty. Add resources from the store to get started.
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-earth-100 overflow-y-auto px-6">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-4 py-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-earth-900">{product.name}</p>
                  <p className="mt-0.5 text-sm text-earth-600">{formatCurrency(product.price_cents)} each</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(product.id, quantity - 1)}
                      aria-label={`Decrease ${product.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-earth-200 transition hover:bg-earth-100"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-earth-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(product.id, Math.min(quantity + 1, product.stock))}
                      disabled={quantity >= product.stock}
                      aria-label={`Increase ${product.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-earth-200 transition hover:bg-earth-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="text-sm font-semibold text-earth-900">{formatCurrency(product.price_cents * quantity)}</p>
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(product.id, 0)}
                    aria-label={`Remove ${product.name}`}
                    className="rounded-lg p-1.5 text-earth-500 transition hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-4 border-t border-earth-100 px-6 py-5">
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <div className="flex items-center justify-between text-base">
            <span className="font-medium text-earth-700">Subtotal</span>
            <span className="font-display text-xl font-bold text-earth-900">{formatCurrency(subtotal)}</span>
          </div>
          <Button className="w-full" onClick={handleCheckout} loading={placing} disabled={items.length === 0}>
            Place order
          </Button>
          <p className="text-center text-xs text-earth-500">Prices are confirmed on the server when you place your order.</p>
        </div>
      </aside>
    </div>
  );
}
