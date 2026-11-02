import { Check, ImageOff, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types';
import type { Cart } from '@/hooks/useCart';
import { Badge, Button } from '@/components/ui';

interface ProductCardProps {
  product: Product;
  cart: Cart;
}

export function ProductCard({ product, cart }: ProductCardProps) {
  const inCart = cart.lines.find((line) => line.productId === product.id)?.quantity ?? 0;
  const outOfStock = product.stock === 0;
  const maxedOut = !outOfStock && inCart >= product.stock;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-earth-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-earth-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-earth-400">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        {inCart > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {inCart} in cart
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Badge tone="green">{product.category}</Badge>
        <h3 className="mt-3 font-display text-base font-semibold leading-snug text-earth-900">{product.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-earth-600">{product.description}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="font-display text-xl font-bold text-earth-900">{formatCurrency(product.price_cents)}</p>
            {outOfStock && <p className="text-xs font-medium text-red-700">Out of stock</p>}
            {lowStock && <p className="text-xs font-medium text-amber-800">Only {product.stock} left</p>}
          </div>
          <Button
            variant={outOfStock || maxedOut ? 'secondary' : 'primary'}
            disabled={outOfStock || maxedOut}
            onClick={() => cart.add(product.id, product.stock)}
            className="py-2"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {outOfStock ? 'Unavailable' : maxedOut ? 'Max added' : 'Add'}
          </Button>
        </div>
      </div>
    </article>
  );
}
