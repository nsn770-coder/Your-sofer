import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CartItem } from '@/app/contexts/CartContext';
import { getTier } from '@/app/lib/loyalty';
import { calcSimchaDiscount, SIMCHA_CODE } from '@/app/lib/promoRules';
import { isBulkEventKippotLine } from '@/app/lib/kippot';

// ── מימוש נקודות מועדון ──────────────────────────────────────────────────────
// נקודה = ₪1 הנחה. ניתן לממש עד 50% מסכום המוצרים בעגלה (אחרי הנחות, לפני משלוח).
const POINTS_REDEEM_LINE_NAME = 'הנחת נקודות מועדון';
const POINTS_MAX_CART_PERCENT = 0.5;

const SUMIT_API_URL        = 'https://api.sumit.co.il/billing/payments/charge/';
const SUMIT_COMPANY_ID     = process.env.SUMIT_COMPANY_ID!;
const SUMIT_API_PRIVATE_KEY = process.env.SUMIT_API_PRIVATE_KEY!;

// Klaf-bearing items (mezuzah/tefillin scrolls) earn a reduced shaliach commission —
// thinner margin on these than on general merchandise.
const KLAF_COMMISSION_PERCENT = 4;

function computeCommissionAmount(
  cartItems: CartItem[],
  commissionPercent: number,
  lineDiscounts?: Record<string, { percent: number; amount: number }> | null,
): number {
  if (!commissionPercent) return 0;
  let amount = 0;
  for (const item of cartItems) {
    const rate = item.selectedKlafId ? KLAF_COMMISSION_PERCENT : commissionPercent;
    // עמלת שליח מחושבת על הסכום אחרי הנחת מבצע SIMCHA (אם חלה על השורה)
    const base = Math.max(0, item.price * item.quantity - (lineDiscounts?.[item.id]?.amount ?? 0));
    amount += base * rate / 100;
  }
  return Math.round(amount * 100) / 100;
}

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

    tx.update(userRef!, {
      totalSpent:    newTotalSpent,
      loyaltyPoints: prevPoints + pointsEarned,
      tier:          newTier.id,
    });
    tx.update(orderDocRef, { loyaltyProcessed: true, pointsEarned });

    // Points history — one sub-doc per purchase
    const historyCol = userRef!.collection('pointsHistory');
    const expiresAt  = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    if (pointsEarned > 0) {
      tx.set(historyCol.doc(), {
        amount: pointsEarned, reason: 'purchase', orderId,
        balanceAfter: prevPoints + pointsEarned,
        createdAt: FieldValue.serverTimestamp(), expiresAt: expiresAt.toISOString(),
      });
    }

    console.log(`[loyalty] uid=${uid ?? email} +${pointsEarned}pts tier:${currentTier.id}→${newTier.id}`);
  });
}

// ── Loyalty redemption helper ─────────────────────────────────────────────────
// Deducts redeemed points from the user AFTER a successful charge, and records a
// negative pointsHistory entry. Non-fatal by design (charge already succeeded) —
// but logged loudly so a failed deduction is never missed.
async function redeemPoints(
  adminDb: ReturnType<typeof getAdminDb>,
  orderId: string,
  uid: string,
  pointsUsed: number,
): Promise<void> {
  const userRef  = adminDb.collection('users').doc(uid);
  const orderRef = adminDb.collection('orders').doc(orderId);

  await adminDb.runTransaction(async (tx) => {
    const [userSnap, orderSnap] = await Promise.all([tx.get(userRef), tx.get(orderRef)]);
    if (orderSnap.data()?.pointsRedeemed === true) return; // idempotency guard

    const prevPoints = Number(userSnap.data()?.loyaltyPoints ?? 0);
    // Never go negative even in a race — deduct what actually exists.
    const deduct = Math.min(prevPoints, pointsUsed);
    const balanceAfter = prevPoints - deduct;

    tx.set(userRef, { loyaltyPoints: balanceAfter }, { merge: true });
    tx.update(orderRef, { pointsRedeemed: true });

    tx.set(userRef.collection('pointsHistory').doc(), {
      amount:       -deduct,
      reason:       'redemption',
      orderId,
      balanceAfter,
      createdAt:    FieldValue.serverTimestamp(),
    });

    if (deduct < pointsUsed) {
      console.error(`[loyalty-redeem] RACE: uid=${uid} order=${orderId} requested=${pointsUsed} had only ${prevPoints}`);
    }
    console.log(`[loyalty-redeem] uid=${uid} order=${orderId} -${deduct}pts balance:${prevPoints}→${balanceAfter}`);
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
      uid, pointsUsed, idToken,
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
      pointsUsed?: number;
      idToken?: string | null;
    };

    if (!singleUseToken) {
      return NextResponse.json({ error: 'חסר טוקן תשלום' }, { status: 400 });
    }

    // Product items (excludes discount lines and shipping)
    const productItems = items.filter(i =>
      !i.name.includes('הנחת') && !i.name.includes('משלוח') && !i.name.includes('מתנה:')
      && !i.name.startsWith('מבצע כיפות')
    );

    // ── A3: minimum 5 units for items < ₪25 (excluding kippot and print service) ──
    for (const item of productItems) {
      if (item.price > 0 && item.price < 25 && item.cat !== 'כיפות' && item.cat !== 'הדפסה' && item.quantity < 5) {
        console.error(`[payment] min-qty violation: ${item.name} qty=${item.quantity}`);
        return NextResponse.json({ error: 'מינימום 5 יחידות למוצרים זולים' }, { status: 400 });
      }
    }

    // kippot bulk discount removed — no 30% validation needed
    const kippotDiscountActive = false;
    const kippotDiscountAmount = 0;

    // ── A1: event print tiered pricing validation ─────────────────────────────
    const printServiceItems = productItems.filter(i => i.cat === 'הדפסה');
    if (printServiceItems.length > 0) {
      const totalPrintQty = printServiceItems.reduce((s, i) => s + i.quantity, 0);
      const expectedPricePerUnit = getEventPrintPricePerUnit(totalPrintQty);
      for (const psi of printServiceItems) {
        // ₪0 print items are valid — printing included in the kippah tiered price
        if (psi.price === 0) continue;
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
    let simchaBreakdown: Record<string, { percent: number; amount: number }> | null = null;

    if (couponCode === SIMCHA_CODE) {
      // ── מבצע SIMCHA: חישוב מלא בצד שרת — שיוך אירועים נשלף ממסמכי המוצרים ──
      const simchaLine = items.find(i => i.name.includes('הנחת קופון'));
      const submittedSimchaDisc = simchaLine ? -simchaLine.price : 0;
      try {
        const adminDb = getAdminDb();
        const flagIds = cartItems.filter(i => !i.id.startsWith('print-')).map(i => i.id);
        const flagMap: Record<string, { isEventProduct: boolean; eventSection: string | null }> = {};
        if (flagIds.length > 0) {
          const snaps = await adminDb.getAll(...flagIds.map(id => adminDb.collection('products').doc(id)));
          for (const s of snaps) {
            const d = s.exists ? s.data() : null;
            flagMap[s.id] = { isEventProduct: d?.isEventProduct === true, eventSection: d?.eventScrollSection ?? null };
          }
        }
        const simcha = calcSimchaDiscount(cartItems.map(i => ({
          id: i.id, price: i.price, quantity: i.quantity, cat: i.cat,
          hasOtherPromo: !!(i.bundlePromo || i.promoPlan),
          isEventProduct: flagMap[i.id]?.isEventProduct ?? false,
          eventSection: flagMap[i.id]?.eventSection ?? null,
        })));
        if (Math.abs(submittedSimchaDisc - simcha.totalDiscount) > 0.02) {
          console.error('[payment] SIMCHA discount mismatch', { submittedSimchaDisc, expected: simcha.totalDiscount });
          return NextResponse.json({ error: 'שגיאה בחישוב הנחת מבצע SIMCHA' }, { status: 400 });
        }
        couponDiscountAmount = simcha.totalDiscount;
        simchaBreakdown = simcha.totalDiscount > 0 ? simcha.lineDiscounts : null;
      } catch (simchaErr) {
        // Firebase Admin לא זמין — כמו בקופונים רגילים: לא חוסמים תשלום אמיתי
        console.error('[payment] SIMCHA validation skipped — Firebase Admin error:', simchaErr);
        couponDiscountAmount = submittedSimchaDisc;
      }
    } else if (couponCode) {
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
          // כיפות לאירועים בכמויות (30+) — לא זכאיות לקופון (מקביל ל-CartContext)
          if (isBulkEventKippotLine(item)) continue;
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

    // ── A5: server-side points-redemption validation ──────────────────────────
    // נקודה = ₪1. מותר לממש עד 50% מסכום המוצרים (אחרי הנחות חבילות/קופון, לפני משלוח).
    // חובה טוקן Firebase מאומת — מונע ניכוי נקודות מחשבון של מישהו אחר.
    const requestedPoints = Math.floor(Number(pointsUsed ?? 0));
    let redeemUid: string | null = null;

    if (requestedPoints > 0) {
      if (!Number.isFinite(requestedPoints) || requestedPoints < 0) {
        return NextResponse.json({ error: 'ערך נקודות לא תקין' }, { status: 400 });
      }
      if (!idToken) {
        return NextResponse.json({ error: 'מימוש נקודות מחייב התחברות' }, { status: 401 });
      }
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        redeemUid = decoded.uid;
      } catch {
        return NextResponse.json({ error: 'אימות המשתמש נכשל — התחבר מחדש ונסה שוב' }, { status: 401 });
      }

      // 1. יתרת נקודות אמיתית מ-Firestore
      const adminDb = getAdminDb();
      const redeemUserSnap = await adminDb.collection('users').doc(redeemUid).get();
      const availablePoints = Number(redeemUserSnap.data()?.loyaltyPoints ?? 0);
      if (requestedPoints > availablePoints) {
        return NextResponse.json({ error: 'אין מספיק נקודות בחשבון' }, { status: 400 });
      }

      // 2. תקרה: 50% מסכום המוצרים נטו (אחרי הנחת חבילות וקופון, לפני משלוח)
      const productsGross = productItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const bundleLine    = items.find(i => i.name.includes('מבצע כיפות — חבילות'));
      const bundleDisc    = bundleLine ? -bundleLine.price : 0;
      const netProducts   = Math.max(0, productsGross - bundleDisc - couponDiscountAmount);
      const maxRedeemable = Math.floor(netProducts * POINTS_MAX_CART_PERCENT);
      if (requestedPoints > maxRedeemable) {
        console.error('[payment] points cap exceeded', { requestedPoints, maxRedeemable, netProducts });
        return NextResponse.json({ error: `ניתן לממש עד ${maxRedeemable} נקודות בהזמנה זו (50% מסכום העגלה)` }, { status: 400 });
      }

      // 3. שורת ההנחה חייבת להתאים בדיוק לכמות הנקודות
      const pointsLine = items.find(i => i.name === POINTS_REDEEM_LINE_NAME);
      const submittedPointsDisc = pointsLine ? -pointsLine.price : 0;
      if (Math.abs(submittedPointsDisc - requestedPoints) > 0.02) {
        console.error('[payment] points discount mismatch', { submittedPointsDisc, requestedPoints });
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת הנקודות' }, { status: 400 });
      }
    }

    // ── A7: whole-shekel charge — round every line at payload build ──────────
    // Product prices are stored whole (A1/A2), but percent coupons and promo
    // allocations can re-introduce fractions on discount lines. The customer-
    // facing UI displays whole shekels (formatPrice rounds), so the charge must
    // match: round each line's final unit price; the charged total is then the
    // exact sum of the (whole) lines. Validations above already ran on the raw
    // client values with the old 0.02 tolerance — rounding happens strictly
    // after all discounts are validated and allocated.
    const chargeItems = items.map(item => ({
      name:      item.name,
      quantity:  item.quantity,
      unitPrice: Math.round(item.price),
    }));
    const chargedTotal = chargeItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    // Sanity: rounding may shift the client total by at most ±0.5 per fractional
    // line. Anything beyond ±2 means the client and server disagree — abort.
    if (!Number.isFinite(chargedTotal) || Math.abs(chargedTotal - total) > 2) {
      console.error('[payment] rounded-total mismatch', { total, chargedTotal });
      return NextResponse.json({ error: 'שגיאה בחישוב הסכום לחיוב' }, { status: 400 });
    }
    if (chargedTotal !== total) {
      console.log('[payment] A7 rounding applied — clientTotal:', total, '→ chargedTotal:', chargedTotal);
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
      Items: chargeItems.map(item => ({
        Item:      { Name: item.name },
        Quantity:  item.quantity,
        UnitPrice: item.unitPrice,
      })),
      Payments_Count:      paymentsCount,
      VATIncluded:         true,
      SendDocumentByEmail: true,
    };

    console.log('[payment] charging Sumit — total:', chargedTotal, 'items:', chargeItems.length, 'paymentsCount:', paymentsCount, 'CompanyID set:', !!SUMIT_COMPANY_ID);
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
    // מזהה ייחודי אמיתי: 8 ספרות timestamp + 3 ספרות אקראיות.
    // (הפורמט הישן — 6 ספרות timestamp — חזר על עצמו כל ~17 דקות וגרם
    // לסיכון שגוגל יזרוק רכישה אמיתית בגלל דדופליקציה על transaction_id זהה.)
    const orderNumber = 'YS-' + Date.now().toString().slice(-8) + String(Math.floor(Math.random() * 900) + 100);
    const commissionAmount = shaliachId ? computeCommissionAmount(cartItems, commissionPercent || 0, simchaBreakdown) : 0;

    let orderRef;
    try {
      const adminDb = getAdminDb();
      orderRef = await adminDb.collection('orders').add({
        orderNumber,
        customerName: customer.name, email: customer.email, phone: customer.phone,
        address: address || '', notes: notes || '',
        items: [
          ...cartItems.map(i => ({
            id: i.id, productId: i.productId || i.id, name: i.name, productName: i.name, price: i.price, quantity: i.quantity,
            selectedKlafId: i.selectedKlafId || null, selectedKlafName: i.selectedKlafName || null,
            embroideryText: i.embroideryText || null,
            embroideryOptions: i.embroideryOptions || null, embroiderySurcharge: i.embroiderySurcharge || null,
            threadColor: i.threadColor || null,
            embossingText: i.embossingText || null, embossingColor: i.embossingColor || null, embossingSurcharge: i.embossingSurcharge || null,
            selectedCover: i.selectedCover || null,
            printCustomization: i.printCustomization || null,
          })),
          ...(giftLine ? [{ id: giftLine.productId || giftLine.id, name: `מתנה: ${giftLine.name}`, price: 0, quantity: 1, isGift: true, giftSourceId: giftLine.id }] : []),
        ],
        // A7: the order records what was actually charged — whole-shekel lines
        total: chargedTotal,
        ...(chargedTotal !== total ? { totalBeforeRounding: total } : {}),
        couponCode: couponCode || null, couponDiscount: couponDiscountAmount > 0 ? Math.round(couponDiscountAmount) : null,
        discountBreakdown: simchaBreakdown, totalDiscount: couponDiscountAmount > 0 ? Math.round(couponDiscountAmount) : null,
        selectedGift: selectedGift || null,
        kippotDiscount: kippotDiscountAmount > 0 ? kippotDiscountAmount : null,
        shippingCost: shippingCost || 0, shippingType: shippingType || 'regular',
        status: 'paid', createdAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp(),
        account: 'business', // charged via the business Sumit account (from 10/07/2026); amuta-era orders have no field

        shaliachRef: refCode || null, shaliachId: shaliachId || null, shaliachName: shaliachName || null,
        commissionPercent: commissionPercent || 0, commissionAmount,
        uid: uid || null, guestId: sessionId || null, sessionId: sessionId || null, isGuest: !uid,
        loyaltyProcessed: false,
        pointsUsed: requestedPoints > 0 ? requestedPoints : null,
        pointsDiscount: requestedPoints > 0 ? requestedPoints : null,
        pointsRedeemed: false,
      });

      const sideEffects: Promise<unknown>[] = [];
      // SIMCHA הוא קופון מבוסס-חוקים — אין לו מסמך coupons לעדכן
      if (couponCode && couponCode !== SIMCHA_CODE) {
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

      // ── Loyalty redemption — deduct the points that paid for this order ──────
      // (before accrual, so the new balance already reflects the deduction)
      if (requestedPoints > 0 && redeemUid) {
        try {
          await redeemPoints(adminDb, orderRef.id, redeemUid, requestedPoints);
        } catch (redeemErr) {
          console.error('[payment] POINTS REDEMPTION FAILED — deduct manually!', { orderId: orderRef.id, uid: redeemUid, requestedPoints }, redeemErr);
        }
      }

      // ── Loyalty accrual (non-fatal — never blocks payment response) ──────────
      // total כבר אחרי הנחת הנקודות — הצבירה היא רק על מה ששולם בפועל.
      try {
        await accruePoints(adminDb, orderRef.id, uid || null, customer.email, chargedTotal, shippingCost || 0, cartItems);
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
