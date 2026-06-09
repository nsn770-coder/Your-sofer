import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const SUMIT_API_URL    = 'https://api.sumit.co.il/billing/payments/beginredirect/';
const SUMIT_COMPANY_ID = process.env.SUMIT_COMPANY_ID!;
const SUMIT_API_KEY    = process.env.SUMIT_API_KEY!;

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

export async function POST(req: NextRequest) {
  try {
    const { items, total, customer, orderNumber, orderId, baseUrl, couponCode } =
      await req.json() as {
        items:       PaymentItem[];
        total:       number;
        customer:    { name: string; email: string; phone: string };
        orderNumber: string;
        orderId:     string;
        baseUrl:     string;
        couponCode?: string;
      };

    // Product items (excludes discount lines and shipping)
    const productItems = items.filter(i =>
      !i.name.includes('הנחת') && !i.name.includes('משלוח') && !i.name.includes('מתנה:')
    );

    // ── A3: minimum 5 units for items < ₪25 (excluding kippot and print service) ──
    for (const item of productItems) {
      if (item.price < 25 && item.cat !== 'כיפות' && item.cat !== 'הדפסה' && item.quantity < 5) {
        console.error(`[payment] min-qty violation: ${item.name} qty=${item.quantity}`);
        return NextResponse.json({ error: 'מינימום 5 יחידות למוצרים זולים' }, { status: 400 });
      }
    }

    // ── A1: kippot 30% bulk discount validation ───────────────────────────────
    const kippotItems = productItems.filter(i => i.cat === 'כיפות' && !i.bundlePromo);
    const kippotQty   = kippotItems.reduce((s, i) => s + i.quantity, 0);

    if (kippotQty >= KIPPOT_DISCOUNT_QTY) {
      const kippotOriginal   = kippotItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const expectedDiscount = Math.round(kippotOriginal * KIPPOT_DISCOUNT_RATE * 100) / 100;
      const discountLine     = items.find(i => i.name.includes('הנחת כיפות'));
      const submittedDiscount = discountLine ? -discountLine.price : 0;

      if (Math.abs(submittedDiscount - expectedDiscount) > 0.02) {
        console.error(`[payment] kippot discount mismatch`, { expectedDiscount, submittedDiscount });
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת הכיפות' }, { status: 400 });
      }
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
    for (const [promoKey, grpItems] of bundleGroups) {
      const parsed = parseBundle(promoKey);
      if (!parsed) continue;
      const { n, bundlePrice } = parsed;

      const units: number[] = [];
      for (const item of grpItems) {
        for (let i = 0; i < item.quantity; i++) units.push(item.price);
      }
      units.sort((a, b) => b - a);

      const fullBundles = Math.floor(units.length / n);
      const promoUnits  = units.slice(0, fullBundles * n);
      const origPromo   = promoUnits.reduce((s, p) => s + p, 0);
      const discPromo   = fullBundles * bundlePrice;
      expectedBundleDiscount += Math.round((origPromo - discPromo) * 100) / 100;
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
    if (couponCode) {
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
      const kippotDiscountActiveServer = kippotQty >= KIPPOT_DISCOUNT_QTY;
      let serverDiscountableTotal = 0;
      for (const item of productItems) {
        if (item.bundlePromo) continue;
        if (item.cat === 'הדפסה') continue;
        if (item.cat === 'כיפות' && kippotDiscountActiveServer) continue;
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
    }

    // ── Build Sumit payload ───────────────────────────────────────────────────
    const body = {
      Customer: {
        Name:         customer.name,
        EmailAddress: customer.email,
        Phone:        customer.phone,
        SearchMode:   0,
      },
      Items: items.map(item => ({
        Item:      { Name: item.name, Price: item.price },
        Quantity:  item.quantity,
        UnitPrice: item.price,
      })),
      VATIncluded:         true,
      RedirectURL:         `${baseUrl}/thank-you?order=${orderNumber}&orderId=${orderId}`,
      CancelRedirectURL:   `${baseUrl}/checkout?error=payment_cancelled`,
      ExternalIdentifier:  orderNumber,
      Credentials: {
        CompanyID: parseInt(SUMIT_COMPANY_ID),
        APIKey:    SUMIT_API_KEY,
      },
    };

    console.log('[payment] calling Sumit — orderNumber:', orderNumber, 'total:', total, 'items:', items.length, 'CompanyID set:', !!SUMIT_COMPANY_ID);
    const response = await fetch(SUMIT_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    let data: unknown;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[payment] Sumit returned non-JSON (status', response.status, '):', rawText.slice(0, 300));
      return NextResponse.json({ error: 'שגיאה בקבלת דף תשלום' }, { status: 500 });
    }
    console.log('[payment] Sumit status:', response.status, 'RedirectURL:', (data as any)?.Data?.RedirectURL ? 'present' : 'missing');

    if ((data as any)?.Data?.RedirectURL) {
      // Side-effect writes (coupon usage, klaf reservation) via Admin SDK.
      // Wrapped in a separate try/catch so a missing/broken Firebase Admin config
      // never blocks the payment redirect that the customer is waiting for.
      try {
        const adminDb = getAdminDb();
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
      } catch (adminErr) {
        // Non-fatal — log and continue so the customer reaches the payment page
        console.error('[payment] admin side-effects failed (non-fatal):', adminErr);
      }

      return NextResponse.json({ url: (data as any).Data.RedirectURL });
    } else {
      console.error('[payment] Sumit returned no RedirectURL:', JSON.stringify(data));
      return NextResponse.json({ error: 'שגיאה בקבלת דף תשלום' }, { status: 500 });
    }
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[payment] unhandled error:', err.message, err.stack);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
