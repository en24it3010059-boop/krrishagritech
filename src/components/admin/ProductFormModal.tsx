import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import { PRODUCT_CATEGORIES } from '@/lib/labels';
import type { Product } from '@/lib/types';
import { Button, Field, InlineAlert, Modal, inputClass } from '@/components/ui';

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? PRODUCT_CATEGORIES[0]);
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    const trimmedImage = imageUrl.trim();

    if (!trimmedName) {
      setError('Enter a product name.');
      return;
    }
    if (price.trim() === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Enter a valid price in dollars.');
      return;
    }
    if (stock.trim() === '' || !Number.isInteger(parsedStock) || parsedStock < 0) {
      setError('Stock must be a whole number, zero or more.');
      return;
    }
    if (trimmedImage && !/^https:\/\//.test(trimmedImage)) {
      setError('The image link must start with https://');
      return;
    }

    const payload = {
      name: trimmedName,
      category,
      description: description.trim(),
      price_cents: Math.round(parsedPrice * 100),
      stock: parsedStock,
      image_url: trimmedImage || null,
    };

    setSaving(true);
    setError(null);
    try {
      const request = product
        ? supabase.from('products').update(payload).eq('id', product.id).select('id').maybeSingle()
        : supabase.from('products').insert(payload).select('id').maybeSingle();
      const { data, error: saveError } = await request;
      if (saveError) throw saveError;
      if (!data) throw new Error('This product could not be saved. Refresh the page and try again.');
      onSaved();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? 'Edit product' : 'Add a product'} description="Products appear in the resource store for farmers." onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name" htmlFor="product-name">
            <input id="product-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Category" htmlFor="product-category">
            <select id="product-category" className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {PRODUCT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price (USD)" htmlFor="product-price">
            <input id="product-price" inputMode="decimal" className={inputClass} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="24.00" />
          </Field>
          <Field label="Units in stock" htmlFor="product-stock">
            <input id="product-stock" inputMode="numeric" className={inputClass} value={stock} onChange={(event) => setStock(event.target.value)} placeholder="20" />
          </Field>
        </div>

        <Field label="Image link" htmlFor="product-image" hint="Optional. Paste a secure (https) image address.">
          <input id="product-image" className={inputClass} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
        </Field>

        <Field label="Description" htmlFor="product-description">
          <textarea id="product-description" rows={3} className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {product ? 'Save changes' : 'Add product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
