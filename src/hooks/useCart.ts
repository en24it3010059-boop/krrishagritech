import { useEffect, useState } from 'react';

const STORAGE_KEY = 'agritech-cart';

export interface CartLine {
  productId: string;
  quantity: number;
}

function readStoredCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.productId === 'string' && typeof line?.quantity === 'number' && line.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(readStoredCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const add = (productId: string, maxQuantity: number) => {
    if (maxQuantity < 1) return;
    setLines((previous) => {
      const existing = previous.find((line) => line.productId === productId);
      if (!existing) return [...previous, { productId, quantity: 1 }];
      return previous.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.min(line.quantity + 1, maxQuantity) } : line,
      );
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setLines((previous) =>
      quantity < 1
        ? previous.filter((line) => line.productId !== productId)
        : previous.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  };

  const clear = () => setLines([]);

  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return { lines, add, setQuantity, clear, count };
}

export type Cart = ReturnType<typeof useCart>;
