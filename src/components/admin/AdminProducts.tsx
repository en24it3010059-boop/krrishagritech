import { useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getErrorMessage } from '@/lib/format';
import type { Product } from '@/lib/types';
import { Badge, Button, Card, EmptyState, InlineAlert, LoadingState } from '@/components/ui';
import { ProductFormModal } from '@/components/admin/ProductFormModal';

type ProductEditor = { mode: 'create' } | { mode: 'edit'; product: Product };

export function AdminProducts({ onChanged }: { onChanged: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<ProductEditor | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadProducts = async () => {
    const { data, error: loadError } = await supabase.from('products').select('*').order('name');
    if (loadError) {
      setError(getErrorMessage(loadError));
      return;
    }
    setError(null);
    setProducts((data as Product[]) ?? []);
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const toggleActive = async (product: Product) => {
    setTogglingId(product.id);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('This product could not be updated. Refresh the page and try again.');
      await loadProducts();
      onChanged();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-earth-600">Archived products are hidden from farmers but kept for order history.</p>
        <Button onClick={() => setEditor({ mode: 'create' })} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add product
        </Button>
      </div>

      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {!products && !error && <LoadingState label="Loading products..." />}

      {products && products.length === 0 && (
        <EmptyState icon={Package} title="No products yet" description="Add the seeds, fertiliser and tools farmers can order." />
      )}

      {products && products.length > 0 && (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-earth-100 text-earth-400">
                    <Package className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-earth-900">{product.name}</p>
                    {!product.is_active && <Badge tone="neutral">Archived</Badge>}
                  </div>
                  <p className="text-sm text-earth-600">
                    {product.category} · {formatCurrency(product.price_cents)} · {product.stock} in stock
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button variant="secondary" className="py-2" onClick={() => setEditor({ mode: 'edit', product })}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="py-2"
                  loading={togglingId === product.id}
                  onClick={() => void toggleActive(product)}
                >
                  {product.is_active ? <Archive className="h-4 w-4" aria-hidden="true" /> : <ArchiveRestore className="h-4 w-4" aria-hidden="true" />}
                  {product.is_active ? 'Archive' : 'Restore'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <ProductFormModal
          product={editor.mode === 'edit' ? editor.product : null}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void loadProducts();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
