'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  quantity: number;
  selectedKlafId?: string;
  selectedKlafName?: string;
  embroideryText?: string;
  selectedCover?: { id: string; name: string; imgUrl: string };
  promoPlan?: string;
  promoPrice?: number;
  printCustomization?: {
    productType: string;
    side: string;
    color?: string;
    uploadedImageUrl: string;
    bgRemoved: boolean;
    originalImageUrl: string;
    imageX?: number;
    imageY?: number;
    imageScale?: number;
    imageRotation?: number;
  };
}

/**
 * Calculates the effective total applying 2+1 promo logic.
 * For every 3 units of a "2+1" item, the cheapest unit is free.
 */
function calcTotal(items: CartItem[]): number {
  let total = 0;
  for (const item of items) {
    if (item.promoPlan === '2+1' && item.quantity >= 3) {
      const sets = Math.floor(item.quantity / 3);
      const remainder = item.quantity % 3;
      // Each set of 3: pay for 2 (cheapest unit = item.price is free)
      total += sets * item.price * 2 + remainder * item.price;
    } else {
      total += item.price * item.quantity;
    }
  }
  return Math.round(total * 100) / 100;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  promoSavings: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  function addItem(product: CartItem) {
    setItems(prev => {
      const existing = prev.find(x => x.id === product.id);
      if (existing) {
        return prev.map(x => x.id === product.id
          ? {
              ...x,
              quantity: x.quantity + 1,
              selectedKlafId: product.selectedKlafId ?? x.selectedKlafId,
              selectedKlafName: product.selectedKlafName ?? x.selectedKlafName,
              selectedCover: product.selectedCover ?? x.selectedCover,
            }
          : x
        );
      }
      return [...prev, { ...product, quantity: product.quantity ?? 1 }];
    });
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(x => x.id !== id));
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(x => x.id === id ? { ...x, quantity: qty } : x));
  }

  function clearCart() {
    setItems([]);
  }

  const regularTotal = items.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const total = calcTotal(items);
  const promoSavings = Math.round((regularTotal - total) * 100) / 100;
  const count = items.reduce((sum, x) => sum + x.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count, promoSavings }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
