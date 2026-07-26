'use client';

// ── Chat assistant "add to cart" bridge ───────────────────────────────────────
// Implements the native hook required by the chat-widget integration spec:
// window.__chatAddToCart(productId, variantId, quantity) → { ok, cartCount? }
//
// The chat widget runs in an iframe and cannot write our cart cross-origin, so
// its loader calls this global function on OUR page. We resolve the product from
// Firestore exactly like the live product page does (same visibility gate, same
// effective-price logic, same min-quantity rule) and write it into CartContext —
// the same cart the customer sees at checkout.
//
// productId  — the product's `id` from the chat REST contract
//              (app/api/chat/products) = the Firestore products doc id.
// variantId  — we don't expose variants in the chat contract, so this is
//              normally "". If a non-empty id arrives we treat it as a klaf id
//              (best-effort lookup in `klafim`) to stay forward-compatible.
// quantity   — integer ≥ 1.

import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart, CartItem } from '../../contexts/CartContext';
import { addToCart as pixelAddToCart } from '@/lib/metaPixel';
import { effectivePrice } from '@/app/lib/utils';

type BridgeResult = { ok: true; cartCount: number } | { ok: false; error: string };

declare global {
  interface Window {
    __chatAddToCart?: (
      productId: string,
      variantId: string,
      quantity: number,
    ) => Promise<BridgeResult>;
  }
}

// Same visibility rules as app/api/chat/_lib/serialize.ts (isVisibleProduct).
function isVisibleProduct(d: Record<string, unknown>): boolean {
  if (!d) return false;
  if (d.hidden === true) return false;
  if (d.status === 'inactive' || d.status === 'draft') return false;
  if (!d.name) return false;
  if (d.price == null) return false;
  return true;
}

// Same purchasability gate as the live product page / chat API (isInStock).
function isInStock(d: Record<string, unknown>): boolean {
  if (d.outOfStock === true) return false;
  if (d.available === false) return false;
  if (d.stockStatus === 'out_of_stock') return false;
  if (d.availability === 'out_of_stock') return false;
  return true;
}

export default function ChatCartBridge() {
  const cart = useCart();

  // The bridge function is registered once, but must always act on the CURRENT
  // cart state — keep the latest context in a ref to avoid stale closures.
  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => {
    window.__chatAddToCart = async function (
      productId: string,
      variantId: string,
      quantity: number,
    ): Promise<BridgeResult> {
      try {
        // ── Validate params ──────────────────────────────────────────────────
        if (!productId || typeof productId !== 'string') {
          return { ok: false, error: 'invalid productId' };
        }
        const qty = Math.floor(Number(quantity));
        if (!Number.isFinite(qty) || qty < 1) {
          return { ok: false, error: 'invalid quantity' };
        }

        // ── Resolve the product (live price/stock) ───────────────────────────
        const snap = await getDoc(doc(db, 'products', productId));
        const data = snap.data() as Record<string, unknown> | undefined;
        if (!snap.exists() || !data || !isVisibleProduct(data)) {
          return { ok: false, error: 'product not found' };
        }
        if (!isInStock(data)) {
          return { ok: false, error: 'out of stock' };
        }

        const price = effectivePrice(data);
        const cat = (data.cat ?? data.category) ? String(data.cat ?? data.category) : undefined;

        // A3: cheap non-kippot items have a minimum of 5 units — same rule the
        // cart itself enforces in updateQty().
        const minQty = price > 0 && price < 25 && cat !== 'כיפות' ? 5 : 1;
        const effectiveQty = Math.max(qty, minQty);

        // ── Optional variant → klaf (best-effort, non-fatal) ─────────────────
        let selectedKlafId: string | undefined;
        let selectedKlafName: string | undefined;
        if (variantId && typeof variantId === 'string') {
          selectedKlafId = variantId;
          try {
            const klafSnap = await getDoc(doc(db, 'klafim', variantId));
            const klaf = klafSnap.data();
            if (klafSnap.exists() && klaf?.name) selectedKlafName = String(klaf.name);
          } catch {
            /* klaf name is cosmetic — never fail the add over it */
          }
        }

        // ── Write to the cart ────────────────────────────────────────────────
        const { items, addItem, updateQty } = cartRef.current;
        const existing = items.find((x) => x.id === productId);

        if (existing) {
          updateQty(productId, existing.quantity + effectiveQty);
        } else {
          const item: CartItem = {
            id: productId,
            name: String(data.name ?? ''),
            price,
            imgUrl: (data.imgUrl ?? data.image_url) ? String(data.imgUrl ?? data.image_url) : undefined,
            quantity: effectiveQty,
            cat,
            bundlePromo: data.bundlePromo ? String(data.bundlePromo) : undefined,
            ...(selectedKlafId ? { selectedKlafId, selectedKlafName } : {}),
          };
          addItem(item);
        }

        // ── Analytics — same events the product page fires ───────────────────
        try {
          window.gtag?.('event', 'add_to_cart', {
            currency: 'ILS',
            value: price * effectiveQty,
            items: [{ item_id: productId, item_name: String(data.name ?? ''), price, quantity: effectiveQty }],
          });
          pixelAddToCart({
            id: productId,
            name: String(data.name ?? ''),
            price,
            quantity: effectiveQty,
          });
        } catch {
          /* analytics must never break the add */
        }

        const cartCount = cartRef.current.count + effectiveQty;
        return { ok: true, cartCount };
      } catch (err) {
        console.error('[__chatAddToCart]', err);
        return { ok: false, error: 'add failed' };
      }
    };

    return () => {
      delete window.__chatAddToCart;
    };
  }, []);

  return null;
}
