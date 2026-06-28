import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CartItem } from '@/app/contexts/CartContext';
import { getTier } from '@/app/lib/loyalty';

const SUMIT_API_URL        = 'https://api.sumit.co.il/billing/payments/charge/';
const SUMIT_COMPANY_ID     = process.env.SUMIT_COMPANY_ID!;
const SUMIT_API_PRIVATE_KEY = process.env.SUMIT_API_PRIVATE_KEY!;

// Klaf-bearing items (mezuzah/tefillin scrolls) earn a reduced shaliach commission —
// thinner margin on these than on general merchandise.
const KLAF_COMMISSION_PERCENT = 4;

function computeCommissionAmount(cartItems: CartItem[], commissionPercent: number): number {
  if (!commissionPercent) return 0;
  let amount = 0;
  for (const item of cartItems) {
    const rate = item.selectedKlafId ? KLAF_COMMISSION_PERCENT : commissionPercent;
    amount += item.price * item.quantity * rate / 100;
  }
  return Math.round(amount * 100) / 100;
}

// ── Must match app/contexts/CartContext.tsx ───────────────────────────────────
const KIPPOT_DISCOUNT_QTY  = 100;
const KIPPOT_DISCOUNT_RATE = 0.30;

// ── A1: event print tiered pricing ───────────────────────────────────────────
function getEventPrintPricePerUnit(qty: number): number {
  if (qty >= 100) return 5;
  if (qty >= 50)  return 7;
  return 20;
}

interface PaymentItem {
  name:        string;
  price:       number;
  quantity:    number;
  cat?:        string;
  bundlePromo?: string;
}

function parseBundle(key: string): { n: number; bundlePrice: number } | null {
  const m = key.match(/^(\d+)for(\d+)$/);
  if (!m) return null;
  return { n: parseInt(m[1]), bundlePrice: parseInt(m[2]) };
}

// ── Loyalty accrual helper ────────────────────────────────────────────────────
// Non-fatal: called inside its own try/catch so it never blocks payment response.
async function accruePoints(
  adminDb: ReturnType<typeof getAdminDb>,
  orderId: string,
  uid: string | null,
  email: string,
  total: number,
  shippingCost: number,
  cartItems: CartItem[],
): Promise<void> {
  // Resolve user document — prefer uid, fallback to email query for legacy orders
  const uidSnap = uid ? await adminDb.collection('users').doc(uid).get() : null;
  let userRef   = uidSnap?.exists ? uidSnap.ref : null;
  if (!userRef && email) {
    const q = await adminDb.collection('users').where('email', '==', email).limit(1).get();
    if (!q.empty) userRef = q.docs[0].ref;
  }
  if (!userRef) return; // guest without account — skip silently

  const orderDocRef = adminDb.collection('orders').doc(orderId);

  await adminDb.runTransaction(async (tx) => {
    const [userSnap, orderSnap] = await Promise.all([tx.get(userRef!), tx.get(orderDocRef)]);
    if (orderSnap.data()?.loyaltyProcessed === true) return; // idempotency guard

    const data        = userSnap.data() ?? {};
    const prevSpent   = Number(data.totalSpent   ?? 0);
    const prevPoints  = Number(data.loyaltyPoints ?? 0);
    const currentTier = getTier(prevSpent);

    // Accrue on (total − shipping) only; kippot earn a capped 5% regardless of tier
    const baseAmount  = Math.max(0, total - (shippingCost || 0));
    const kippotBase  = cartItems
      .filter(i => i.cat === 'כיפות')
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
    const regularBase = Math.max(0, baseAmount - kippotBase);

    const pointsEarned =
      Math.floor(kippotBase  * 0.05) +
      Math.floor(regularBase * currentTier.accrualRate / 100);

    const newTotalSpent = prevSpent + baseAmount;
    const newTier       = getTier(newTotalSpent);

    // One-time tier-upgrade bonuses (flags prevent double-granting)
    const bonuses: Array<{ amount: number; reason: string }> = [];
    if (newTier.id !== 'bronze' && !data.silverBonusGranted) bonuses.push({ amount: 200, reason: 'silver_bonus' });
    if (newTier.id === 'gold'   && !data.goldBonusGranted)   bonuses.push({ amount: 400, reason: 'gold_bonus'   });
    const bonusTotal = bonuses.reduce((s, b) => s + b.amount, 0);

    const userUpdate: Record<string, unknown> = {
      totalSpent:    newTotalSpent,
      loyaltyPoints: prevPoints + pointsEarned + bonusTotal,
      tier:          newTier.id,
    };
    if (bonuses.some(b => b.reason === 'silver_bonus')) userUpdate.silverBonusGranted = true;
    if (bonuses.some(b => b.reason === 'gold_bonus'))   userUpdate.goldBonusGranted   = true;

    tx.update(userRef!, userUpdate);
    tx.update(orderDocRef, { loyaltyProcessed: true });

    // Points history — one Firestore sub-doc per credit reason
    const historyCol = userRef!.collection('pointsHistory');
    const expiresAt  = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const expiresAtISO = expiresAt.toISOString();
    let runningBalance = prevPoints;

    if (pointsEarned > 0) {
      runningBalance += pointsEarned;
      tx.set(historyCol.doc(), {
        amount: pointsEarned, reason: 'purchase', orderId,
        balanceAfter: runningBalance,
        createdAt: FieldValue.serverTimestamp(), expiresAt: expiresAtISO,
      });
    }
    for (const bonus of bonuses) {
      runningBalance += bonus.amount;
      tx.set(historyCol.doc(), {
        amount: bonus.amount, reason: bonus.reason, orderId,
        balanceAfter: runningBalance,
        createdAt: FieldValue.serverTimestamp(), expiresAt: expiresAtISO,
      });
    }

    console.log(`[loyalty] uid=${uid ?? email} +${pointsEarned}pts bonus=${bonusTotal}pts tier:${currentTier.id}→${newTier.id}`);
  });
}

export async function POST(req: NextRequest) {
  try {
    // ── Feature 1: server-side checkout gate ─────────────────────────────────
    try {
      const adminDb = getAdminDb();
      const settingsSnap = await adminDb.collection('siteSettings').doc('global').get();
      if (settingsSnap.exists) {
        const settings = settingsSnap.data()!;
        if (settings.checkoutEnabled === false) {
          console.warn('[payment] checkout disabled by siteSettings');
          return NextResponse.json(
            { error: settings.checkoutDisabledMessage ?? 'הרכישות באתר אינן זמינות כעת' },
            { status: 503 },
          );
        }
      }
    } catch (settingsErr) {
      // Non-fatal — if Firebase Admin is unavailable, allow payment to proceed
      console.error('[payment] siteSettings check failed (non-fatal):', settingsErr);
    }

    const {
      items, total, customer, couponCode,
      singleUseToken, paymentsCount,
      cartItems, address, notes, selectedGift, giftLine,
      shippingCost, shippingType,
      sessionId, refCode, shaliachId, shaliachName, commissionPercent,
      uid,
    } = await req.json() as {
      items:          PaymentItem[];
      total:          number;
      customer:       { name: string; email: string; phone: string };
      couponCode?:    string;
      singleUseToken: string;
      paymentsCount:  number;
      cartItems:      CartItem[];
      address:        string;
      notes?:         string;
      selectedGift?:  string | null;
      giftLine?:      { id: string; name: string; productId?: string } | null;
      shippingCost:   number;
      shippingType:   string;
      sessionId?:     string;
      refCode?:       string | null;
      shaliachId?:    string | null;
      shaliachName?:  string | null;
      commissionPercent?: number;
      uid?: string | null;
    };

    if (!singleUseToken) {
      return NextResponse.json({ error: 'חסר טוקן תשלום' }, { status: 400 });
    }

    // Product items (excludes discount lines and shipping)
    const productItems = items.filter(i =>
      !i.name.includes('הנחת') && !i.name.includes('משלוח') && !i.name.includes('מתנה:')
    );

    // ── A3: minimum 5 units for items < ₪25 (excluding kippot and print service) ──
    for (const item of productItems) {
      if (item.price > 0 && item.price < 25 && item.cat !== 'כיפות' && item.cat !== 'הדפסה' && item.quantity < 5) {
        console.error(`[payment] min-qty violation: ${item.name} qty=${item.quantity}`);
        return NextResponse.json({ error: 'מינימום 5 יחידות למוצרים זולים' }, { status: 400 });
      }
    }

    // ── A1: kippot 30% bulk discount validation ───────────────────────────────
    const kippotAllItems       = productItems.filter(i => i.cat === 'כיפות');
    const kippotQty            = kippotAllItems.reduce((s, i) => s + i.quantity, 0);
    const kippotDiscountActive = kippotQty >= KIPPOT_DISCOUNT_QTY;

    let kippotDiscountAmount = 0;
    if (kippotDiscountActive) {
      const kippotOriginal   = kippotAllItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const expectedDiscount = Math.round(kippotOriginal * KIPPOT_DISCOUNT_RATE * 100) / 100;
      const discountLine     = items.find(i => i.name.includes('הנחת כיפות'));
      const submittedDiscount = discountLine ? -discountLine.price : 0;

      if (Math.abs(submittedDiscount - expectedDiscount) > 0.02) {
        console.error(`[payment] kippot discount mismatch`, { expectedDiscount, submittedDiscount });
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת הכיפות' }, { status: 400 });
      }
      kippotDiscountAmount = submittedDiscount;
    }

    // ── A1: event print tiered pricing validation ─────────────────────────────
    const printServiceItems = productItems.filter(i => i.cat === 'הדפסה');
    if (printServiceItems.length > 0) {
      const totalPrintQty = printServiceItems.reduce((s, i) => s + i.quantity, 0);
      const expectedPricePerUnit = getEventPrintPricePerUnit(totalPrintQty);
      for (const psi of printServiceItems) {
        if (Math.abs(psi.price - expectedPricePerUnit) > 0.02) {
          console.error(`[payment] print price mismatch: ${psi.price} expected ${expectedPricePerUnit}`);
          return NextResponse.json({ error: 'שגיאה בחישוב מחיר הדפסה' }, { status: 400 });
        }
      }
    }

    // ── A1: bundle promo validation (NforX) ───────────────────────────────────
    const bundleGroups = new Map<string, PaymentItem[]>();
    for (const item of productItems) {
      if (!item.bundlePromo) continue;
      const grp = bundleGroups.get(item.bundlePromo) ?? [];
      grp.push(item);
      bundleGroups.set(item.bundlePromo, grp);
    }

    let expectedBundleDiscount = 0;
    let bundleDiscountedTotal  = 0;
    for (const [promoKey, grpItems] of bundleGroups) {
      // When 30% wins, kippot bundlePromo are handled by the kippot discount mechanism
      const activeItems = kippotDiscountActive
        ? grpItems.filter(i => i.cat !== 'כיפות')
        : grpItems;

      if (activeItems.length === 0) continue;

      const parsed = parseBundle(promoKey);
      if (!parsed) {
        for (const item of activeItems) {
          bundleDiscountedTotal += item.price * item.quantity;
        }
        continue;
      }
      const { n, bundlePrice } = parsed;

      const units: number[] = [];
      for (const item of activeItems) {
        for (let i = 0; i < item.quantity; i++) units.push(item.price);
      }
      units.sort((a, b) => b - a);

      const fullBundles    = Math.floor(units.length / n);
      const promoUnits     = units.slice(0, fullBundles * n);
      const remainderUnits = units.slice(fullBundles * n);
      const origPromo      = promoUnits.reduce((s, p) => s + p, 0);
      const discPromo      = fullBundles * bundlePrice;
      const remainderCost  = remainderUnits.reduce((s, p) => s + p, 0);
      expectedBundleDiscount += Math.round((origPromo - discPromo) * 100) / 100;
      bundleDiscountedTotal  += discPromo + remainderCost;
    }

    if (expectedBundleDiscount > 0) {
      const bundleDiscountLine  = items.find(i => i.name.includes('מבצע כיפות — חבילות'));
      const submittedBundleDisc = bundleDiscountLine ? -bundleDiscountLine.price : 0;
      if (Math.abs(submittedBundleDisc - expectedBundleDiscount) > 0.02) {
        console.error(`[payment] bundle discount mismatch`, { expectedBundleDiscount, submittedBundleDisc });
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת חבילות הכיפות' }, { status: 400 });
      }
    }

    // ── A2: server-side coupon validation ─────────────────────────────────────
    let couponDiscountAmount = 0;
    if (couponCode) {
      try {
        const adminDb = getAdminDb();
        const couponSnap = await adminDb.collection('coupons').doc(couponCode).get();

        if (!couponSnap.exists) {
          return NextResponse.json({ error: 'קוד קופון לא קיים' }, { status: 400 });
        }
        const couponData = couponSnap.data()!;
        if (!couponData.active) {
          return NextResponse.json({ error: 'קוד קופון לא פעיל' }, { status: 400 });
        }
        if (couponData.expiresAt && new Date(couponData.expiresAt) < new Date()) {
          return NextResponse.json({ error: 'קוד הקופון פג תוקף' }, { status: 400 });
        }

        // Compute server-side discountable total (mirrors CartContext logic)
        let serverDiscountableTotal = bundleDiscountedTotal; // bundle-discounted net amounts
        for (const item of productItems) {
          if (item.bundlePromo) continue; // already counted in bundleDiscountedTotal
          if (item.cat === 'הדפסה') continue;
          if (item.cat === 'כיפות' && kippotDiscountActive) continue;
          serverDiscountableTotal += item.price * item.quantity;
        }

        const couponDiscountLine = items.find(i => i.name.includes('הנחת קופון'));
        const submittedCouponDisc = couponDiscountLine ? -couponDiscountLine.price : 0;

        let expectedCouponDisc = 0;
        if (couponData.type === 'fixed') {
          expectedCouponDisc = Math.min(couponData.discount, serverDiscountableTotal);
        } else {
          expectedCouponDisc = Math.round(serverDiscountableTotal * couponData.discount / 100 * 100) / 100;
        }

        if (submittedCouponDisc > 0 && Math.abs(submittedCouponDisc - expectedCouponDisc) > 0.02) {
          console.error('[payment] coupon discount mismatch', { submittedCouponDisc, expectedCouponDisc });
          return NextResponse.json({ error: 'שגיאה בחישוב הנחת הקופון' }, { status: 400 });
        }
        couponDiscountAmount = submittedCouponDisc;
      } catch (couponValidationErr) {
        // Firebase Admin unavailable — skip server-side coupon check, let payment proceed.
        // Fix: ensure FIREBASE_PRIVATE_KEY in Vercel uses literal \n (not real newlines).
        console.error('[payment] coupon validation skipped — Firebase Admin error:', couponValidationErr);
      }
    }

    // ── Charge the card via the SingleUseToken (PCI: never touches our server) ──
    const chargeBody = {
      SingleUseToken: singleUseToken,
      Credentials: {
        CompanyID: parseInt(SUMIT_COMPANY_ID),
        APIKey:    SUMIT_API_PRIVATE_KEY,
      },
      Customer: {
        Name:         customer.name,
        EmailAddress: customer.email,
        Phone:        customer.phone,
        SearchMode:   0,
      },
      Items: items.map(item => ({
        Item:      { Name: item.name },
        Quantity:  item.quantity,
        UnitPrice: item.price,
      })),
      Payments_Count:      paymentsCount,
      VATIncluded:         true,
      SendDocumentByEmail: true,
    };

    console.log('[payment] charging Sumit — total:', total, 'items:', items.length, 'paymentsCount:', paymentsCount, 'CompanyID set:', !!SUMIT_COMPANY_ID);
    const response = await fetch(SUMIT_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(chargeBody),
    });

    let data: unknown;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[payment] Sumit returned non-JSON (status', response.status, '):', rawText.slice(0, 300));
      return NextResponse.json({ error: 'שגיאה בביצוע התשלום' }, { status: 500 });
    }

    // Sumit's top-level Status field is not a reliable success indicator — the real
    // confirmation is Data.Payment.ValidPayment (confirmed against production logs,
    // where a successful charge issuing a final invoice still came back with this shape).
    const payment = (data as any)?.Data?.Payment;
    const chargeSucceeded = payment?.ValidPayment === true;
    console.log('[payment] Sumit charge response (status', response.status, '):', JSON.stringify(data));

    if (!chargeSucceeded) {
      const errorMessage = (data as any)?.UserErrorMessage || (data as any)?.TechnicalErrorMessage || 'התשלום נכשל, נסה כרטיס אחר';
      return NextResponse.json({ error: errorMessage }, { status: 402 });
    }

    // ── Charge succeeded — create the order now (never create one for a failed charge) ──
    const orderNumber = 'YS-' + Date.now().toString().slice(-6);
    const commissionAmount = shaliachId ? computeCommissionAmount(cartItems, commissionPercent || 0) : 0;

    let orderRef;
    try {
      const adminDb = getAdminDb();
      orderRef = await adminDb.collection('orders').add({
        orderNumber,
        customerName: customer.name, email: customer.email, phone: customer.phone,
        address: address || '', notes: notes || '',
        items: [
          ...cartItems.map(i => ({
            id: i.id, productId: i.id, name: i.name, productName: i.name, price: i.price, quantity: i.quantity,
            selectedKlafId: i.selectedKlafId || null, selectedKlafName: i.selectedKlafName || null,
            embroideryText: i.embroideryText || null, selectedCover: i.selectedCover || null,
            printCustomization: i.printCustomization || null,
          })),
          ...(giftLine ? [{ id: giftLine.productId || giftLine.id, name: `מתנה: ${giftLine.name}`, price: 0, quantity: 1, isGift: true, giftSourceId: giftLine.id }] : []),
        ],
        total, couponCode: couponCode || null, couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : null,
        selectedGift: selectedGift || null,
        kippotDiscount: kippotDiscountAmount > 0 ? kippotDiscountAmount : null,
        shippingCost: shippingCost || 0, shippingType: shippingType || 'regular',
        status: 'paid', createdAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp(),
        shaliachRef: refCode || null, shaliachId: shaliachId || null, shaliachName: shaliachName || null,
        commissionPercent: commissionPercent || 0, commissionAmount,
        uid: uid || null, guestId: sessionId || null, sessionId: sessionId || null, isGuest: !uid,
        loyaltyProcessed: false,
      });

      const sideEffects: Promise<unknown>[] = [];
      if (couponCode) {
        sideEffects.push(
          adminDb.collection('coupons').doc(couponCode).update({
            usedBy: FieldValue.arrayUnion(customer.email || customer.name),
            usedAt: FieldValue.serverTimestamp(),
          })
        );
      }
      const results = await Promise.allSettled(sideEffects);
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[payment] side-effect[${i}] failed:`, r.reason);
      });

      // ── Loyalty accrual (non-fatal — never blocks payment response) ──────────
      try {
        await accruePoints(adminDb, orderRef.id, uid || null, customer.email, total, shippingCost || 0, cartItems);
      } catch (loyaltyErr) {
        console.error('[payment] loyalty accrual failed (non-fatal):', loyaltyErr);
      }
    } catch (adminErr) {
      console.error('[payment] order creation failed after successful charge:', adminErr);
      return NextResponse.json({ error: 'התשלום בוצע אך שמירת ההזמנה נכשלה, פנה אלינו בהקדם' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId: orderRef.id, orderNumber });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[payment] unhandled error:', err.message, err.stack);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
