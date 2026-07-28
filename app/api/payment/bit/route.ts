import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash, randomUUID } from 'crypto';
import type { CartItem } from '@/app/contexts/CartContext';
import { calcSimchaDiscount, SIMCHA_CODE } from '@/app/lib/promoRules';
import { isBulkEventKippotLine } from '@/app/lib/kippot';

// ── תשלום בביט דרך Sumit — Redirect API ──────────────────────────────────────
// זרימה (זהה לפלאגין הרשמי של Sumit ל-WooCommerce):
// 1. ולידציה מלאה בצד שרת (זהה ל-/api/payment) — מחירים, קופון, נקודות.
// 2. יצירת הזמנה ב-Firestore בסטטוס pending_payment עם hash של מפתח IPN סודי.
// 3. קריאה ל-beginredirect עם AutomaticallyRedirectToProviderPaymentPage: 'UpayBit'
//    → Sumit מחזירה RedirectURL, הלקוח מועבר לדף התשלום בביט.
// 4. אחרי תשלום מוצלח: Sumit שולחת IPN ל-/api/payment/bit/ipn (מסמן paid + נקודות/קופון),
//    והלקוח חוזר ל-/thank-you (מיילים, פיקסלים — הזרימה הקיימת).
// 5. ביטול: הלקוח חוזר ל-/checkout?bit=cancelled וההזמנה נשארת pending_payment
//    (מסומנת כנטושה אוטומטית אחרי 30 דק' בדשבורד).

const SUMIT_REDIRECT_API_URL = 'https://api.sumit.co.il/billing/payments/beginredirect/';
const SUMIT_COMPANY_ID       = process.env.SUMIT_COMPANY_ID!;
const SUMIT_API_PRIVATE_KEY  = process.env.SUMIT_API_PRIVATE_KEY!;
const BASE_URL               = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-sofer.com';

// ── מימוש נקודות מועדון (זהה ל-/api/payment) ─────────────────────────────────
const POINTS_REDEEM_LINE_NAME = 'הנחת נקודות מועדון';
const POINTS_MAX_CART_PERCENT = 0.5;

// Klaf-bearing items earn a reduced shaliach commission
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

// ── Tiered kippot discount helper ────────────────────────────────────────────
// 1st unit: full price, 2nd: 10% off, 3rd+: 15% off (discount on cheapest)
function calcTieredKippotDiscount(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => b - a);
  let discounted = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) discounted += sorted[i];
    else if (i === 1) discounted += sorted[i] * 0.9;
    else discounted += sorted[i] * 0.85;
  }
  return sorted.reduce((s, p) => s + p, 0) - discounted;
}

export async function POST(req: NextRequest) {
  try {
    // ── server-side checkout gate ─────────────────────────────────────────────
    try {
      const adminDb = getAdminDb();
      const settingsSnap = await adminDb.collection('siteSettings').doc('global').get();
      if (settingsSnap.exists) {
        const settings = settingsSnap.data()!;
        if (settings.checkoutEnabled === false) {
          console.warn('[payment-bit] checkout disabled by siteSettings');
          return NextResponse.json(
            { error: settings.checkoutDisabledMessage ?? 'הרכישות באתר אינן זמינות כעת' },
            { status: 503 },
          );
        }
      }
    } catch (settingsErr) {
      console.error('[payment-bit] siteSettings check failed (non-fatal):', settingsErr);
    }

    const {
      items, total, customer, couponCode,
      cartItems, address, notes, selectedGift, giftLine,
      shippingCost, shippingType,
      sessionId, refCode, shaliachId, shaliachName, commissionPercent,
      uid, pointsUsed, idToken,
    } = await req.json() as {
      items:          PaymentItem[];
      total:          number;
      customer:       { name: string; email: string; phone: string };
      couponCode?:    string;
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

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: 'חסרים פרטי לקוח' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || !Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'עגלה לא תקינה' }, { status: 400 });
    }

    // Product items (excludes discount lines and shipping)
    const productItems = items.filter(i =>
      !i.name.includes('הנחת') && !i.name.includes('משלוח') && !i.name.includes('מתנה:')
      && !i.name.startsWith('מבצע כיפות')
    );

    // ── A3: minimum 5 units for items < ₪25 (excluding kippot and print service) ──
    for (const item of productItems) {
      if (item.price > 0 && item.price < 25 && item.cat !== 'כיפות' && item.cat !== 'הדפסה' && item.quantity < 5) {
        console.error(`[payment-bit] min-qty violation: ${item.name} qty=${item.quantity}`);
        return NextResponse.json({ error: 'מינימום 5 יחידות למוצרים זולים' }, { status: 400 });
      }
    }

    // ── A1: event print tiered pricing validation ─────────────────────────────
    const printServiceItems = productItems.filter(i => i.cat === 'הדפסה');
    if (printServiceItems.length > 0) {
      const totalPrintQty = printServiceItems.reduce((s, i) => s + i.quantity, 0);
      const expectedPricePerUnit = getEventPrintPricePerUnit(totalPrintQty);
      for (const psi of printServiceItems) {
        // ₪0 print items are valid — printing included in the kippah tiered price
        if (psi.price === 0) continue;
        if (Math.abs(psi.price - expectedPricePerUnit) > 0.02) {
          console.error(`[payment-bit] print price mismatch: ${psi.price} expected ${expectedPricePerUnit}`);
          return NextResponse.json({ error: 'שגיאה בחישוב מחיר הדפסה' }, { status: 400 });
        }
      }
    }

    // ── A1: kippot tiered discount validation ────────────────────────────────
    // חל אוטומטית על כל כיפות בקטגוריה כיפות — אך לא על כיפות לאירועים (30+)
    const kippotProductItems = productItems.filter(i => i.cat === 'כיפות' && !isBulkEventKippotLine(i));
    let expectedBundleDiscount = 0;
    let bundleDiscountedTotal  = 0;

    if (kippotProductItems.length > 0) {
      const kippotPrices: number[] = [];
      for (const item of kippotProductItems) {
        for (let i = 0; i < item.quantity; i++) {
          kippotPrices.push(item.price);
        }
      }

      if (kippotPrices.length > 0) {
        const discount = calcTieredKippotDiscount(kippotPrices);
        expectedBundleDiscount = Math.round(discount * 100) / 100;

        const sorted = [...kippotPrices].sort((a, b) => b - a);
        let discounted = 0;
        for (let i = 0; i < sorted.length; i++) {
          if (i === 0) discounted += sorted[i];
          else if (i === 1) discounted += sorted[i] * 0.9;
          else discounted += sorted[i] * 0.85;
        }
        bundleDiscountedTotal = Math.round(discounted * 100) / 100;
      }
    }

    if (expectedBundleDiscount > 0) {
      const bundleDiscountLine  = items.find(i => i.name.includes('מבצע כיפות') || i.name.includes('הנחה'));
      const submittedBundleDisc = bundleDiscountLine ? -bundleDiscountLine.price : 0;
      if (Math.abs(submittedBundleDisc - expectedBundleDiscount) > 0.02) {
        console.error(`[payment-bit] kippot discount mismatch`, { expectedBundleDiscount, submittedBundleDisc });
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת כיפות' }, { status: 400 });
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
          console.error('[payment-bit] SIMCHA discount mismatch', { submittedSimchaDisc, expected: simcha.totalDiscount });
          return NextResponse.json({ error: 'שגיאה בחישוב הנחת מבצע SIMCHA' }, { status: 400 });
        }
        couponDiscountAmount = simcha.totalDiscount;
        simchaBreakdown = simcha.totalDiscount > 0 ? simcha.lineDiscounts : null;
      } catch (simchaErr) {
        console.error('[payment-bit] SIMCHA validation skipped — Firebase Admin error:', simchaErr);
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

        let serverDiscountableTotal = bundleDiscountedTotal;
        for (const item of productItems) {
          if (item.bundlePromo) continue;
          if (item.cat === 'הדפסה') continue;
          // כיפות לאירועים בכמויות (30+) לא זכאיות לקופון
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
          console.error('[payment-bit] coupon discount mismatch', { submittedCouponDisc, expectedCouponDisc });
          return NextResponse.json({ error: 'שגיאה בחישוב הנחת הקופון' }, { status: 400 });
        }
        couponDiscountAmount = submittedCouponDisc;
      } catch (couponValidationErr) {
        console.error('[payment-bit] coupon validation skipped — Firebase Admin error:', couponValidationErr);
      }
    }

    // ── A5: server-side points-redemption validation ──────────────────────────
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

      const adminDb = getAdminDb();
      const redeemUserSnap = await adminDb.collection('users').doc(redeemUid).get();
      const availablePoints = Number(redeemUserSnap.data()?.loyaltyPoints ?? 0);
      if (requestedPoints > availablePoints) {
        return NextResponse.json({ error: 'אין מספיק נקודות בחשבון' }, { status: 400 });
      }

      const productsGross = productItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const bundleLine    = items.find(i => i.name.includes('מבצע כיפות — חבילות'));
      const bundleDisc    = bundleLine ? -bundleLine.price : 0;
      const netProducts   = Math.max(0, productsGross - bundleDisc - couponDiscountAmount);
      const maxRedeemable = Math.floor(netProducts * POINTS_MAX_CART_PERCENT);
      if (requestedPoints > maxRedeemable) {
        console.error('[payment-bit] points cap exceeded', { requestedPoints, maxRedeemable, netProducts });
        return NextResponse.json({ error: `ניתן לממש עד ${maxRedeemable} נקודות בהזמנה זו (50% מסכום העגלה)` }, { status: 400 });
      }

      const pointsLine = items.find(i => i.name === POINTS_REDEEM_LINE_NAME);
      const submittedPointsDisc = pointsLine ? -pointsLine.price : 0;
      if (Math.abs(submittedPointsDisc - requestedPoints) > 0.02) {
        console.error('[payment-bit] points discount mismatch', { submittedPointsDisc, requestedPoints });
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת הנקודות' }, { status: 400 });
      }
    }

    // ── יצירת הזמנה ממתינה לפני ההפניה לביט ───────────────────────────────────
    // ההזמנה נוצרת לפני התשלום (בניגוד לאשראי) כי האישור מגיע אסינכרונית ב-IPN.
    // status: pending_payment — לא נספרת כהכנסה עד שה-IPN מסמן paid.
    // מזהה ייחודי אמיתי (ראה הערה זהה ב-/api/payment) — מונע התנגשויות transaction_id
    const orderNumber = 'YS-' + Date.now().toString().slice(-8) + String(Math.floor(Math.random() * 900) + 100);
    const commissionAmount = shaliachId ? computeCommissionAmount(cartItems, commissionPercent || 0, simchaBreakdown) : 0;

    // מפתח IPN סודי — נשלח ל-Sumit בלבד; בהזמנה נשמר רק ה-hash (מסמכי orders
    // קריאים מהקליינט, ולכן אסור לשמור בהם את המפתח עצמו).
    const ipnKey = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const ipnKeyHash = createHash('sha256').update(ipnKey).digest('hex');

    const adminDb = getAdminDb();
    const orderRef = await adminDb.collection('orders').add({
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
      total, couponCode: couponCode || null, couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : null,
      discountBreakdown: simchaBreakdown, totalDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : null,
      selectedGift: selectedGift || null,
      kippotDiscount: expectedBundleDiscount > 0 ? expectedBundleDiscount : null,
      shippingCost: shippingCost || 0, shippingType: shippingType || 'regular',
      status: 'pending_payment', createdAt: FieldValue.serverTimestamp(),
      account: 'business',
      paymentMethod: 'bit',
      bitIpnKeyHash: ipnKeyHash,
      bitConfirmed: false,
      bitRedeemUid: redeemUid,
      // snapshot רזה לצבירת נקודות ב-IPN (items השמורים לא כוללים cat)
      bitLoyaltyItems: cartItems.map(i => ({ cat: i.cat || null, price: i.price, quantity: i.quantity })),

      shaliachRef: refCode || null, shaliachId: shaliachId || null, shaliachName: shaliachName || null,
      commissionPercent: commissionPercent || 0, commissionAmount,
      uid: uid || null, guestId: sessionId || null, sessionId: sessionId || null, isGuest: !uid,
      loyaltyProcessed: false,
      pointsUsed: requestedPoints > 0 ? requestedPoints : null,
      pointsDiscount: requestedPoints > 0 ? requestedPoints : null,
      pointsRedeemed: false,
    });

    // ── beginredirect — קבלת דף תשלום ביט מאובטח מ-Sumit ──────────────────────
    const redirectBody = {
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
      VATIncluded:         true,
      SendDocumentByEmail: true,
      UpdateCustomerOnSuccess: true,
      DocumentDescription: `הזמנה ${orderNumber}`,
      Payments_Count:      1,
      MaximumPayments:     1,
      // 'UpayBit' — דילוג על דף בחירת אמצעי תשלום, ישר לדף התשלום של ביט
      AutomaticallyRedirectToProviderPaymentPage: 'UpayBit',
      RedirectURL:       `${BASE_URL}/thank-you?order=${orderNumber}&orderId=${orderRef.id}`,
      CancelRedirectURL: `${BASE_URL}/checkout?bit=cancelled`,
      IPNURL:            `${BASE_URL}/api/payment/bit/ipn?orderId=${orderRef.id}&key=${ipnKey}`,
      ExternalIdentifier: orderRef.id,
    };

    console.log('[payment-bit] beginredirect — total:', total, 'items:', items.length, 'order:', orderNumber);
    const response = await fetch(SUMIT_REDIRECT_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(redirectBody),
    });

    let data: unknown;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[payment-bit] Sumit returned non-JSON (status', response.status, '):', rawText.slice(0, 300));
      await orderRef.delete().catch(() => {});
      return NextResponse.json({ error: 'שגיאה ביצירת דף התשלום בביט' }, { status: 500 });
    }

    const paymentPageUrl: string | undefined = (data as any)?.Data?.RedirectURL;
    if ((data as any)?.Status !== 0 || !paymentPageUrl) {
      console.error('[payment-bit] beginredirect failed:', JSON.stringify(data).slice(0, 500));
      await orderRef.delete().catch(() => {});
      const errorMessage = (data as any)?.UserErrorMessage || (data as any)?.TechnicalErrorMessage || 'שגיאה ביצירת דף התשלום בביט';
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    console.log('[payment-bit] redirect URL created for order', orderNumber, orderRef.id);
    return NextResponse.json({ success: true, url: paymentPageUrl, orderId: orderRef.id, orderNumber });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[payment-bit] unhandled error:', err.message, err.stack);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
