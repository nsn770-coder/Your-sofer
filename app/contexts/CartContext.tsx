'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // טען מ-localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  // שמור ב-localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  function addItem(product: CartItem) {
    setItems(prev => {
      const existing = prev.find(x => x.id === product.id);
      if (existing) {
        return prev.map(x => x.id === product.id
          ? { ...x, quantity: x.quantity + 1 }
          : x
        );
      }
      return [...prev, { ...product, quantity: 1 }];
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

  const total = items.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const count = items.reduce((sum, x) => sum + x.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}