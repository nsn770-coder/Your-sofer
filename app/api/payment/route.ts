import { NextRequest, NextResponse } from 'next/server';

const SUMIT_API_URL    = 'https://api.sumit.co.il/billing/payments/beginredirect/';
const SUMIT_COMPANY_ID = process.env.SUMIT_COMPANY_ID!;
const SUMIT_API_KEY    = process.env.SUMIT_API_KEY!;

// ── Must match app/contexts/CartContext.tsx ───────────────────────────────────
const KIPPOT_DISCOUNT_QTY  = 100;
const KIPPOT_DISCOUNT_RATE = 0.30;
const PRINT_DISCOUNT_QTY   = 50;
const PRINT_DISCOUNT_RATE  = 0.55;

interface PaymentItem {
  name:        string;
  price:       number;
  quantity:    number;
  cat?:        string;
  bundlePromo?: string; // e.g. '4for100', '12for100'
}

function parseBundle(key: string): { n: number; bundlePrice: number } | null {
  const m = key.match(/^(\d+)for(\d+)$/);
  if (!m) return null;
  return { n: parseInt(m[1]), bundlePrice: parseInt(m[2]) };
}

export async function POST(req: NextRequest) {
  try {
    const { items, total, customer, orderNumber, orderId, baseUrl } =
      await req.json() as {
        items:       PaymentItem[];
        total:       number;
        customer:    { name: string; email: string; phone: string };
        orderNumber: string;
        orderId:     string;
        baseUrl:     string;
      };

    // ── Server-side kippot discount validation ────────────────────────────────
    // Only regular kippot (no bundlePromo) count toward the 30% threshold.
    const kippotItems  = items.filter(i => i.cat === 'כיפות' && !i.bundlePromo);
    const kippotQty    = kippotItems.reduce((s, i) => s + i.quantity, 0);

    if (kippotQty >= KIPPOT_DISCOUNT_QTY) {
      const kippotOriginal   = kippotItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const expectedDiscount = Math.round(kippotOriginal * KIPPOT_DISCOUNT_RATE * 100) / 100;

      const discountLine      = items.find(i => i.name.includes('הנחת כיפות'));
      const submittedDiscount = discountLine ? -discountLine.price : 0;

      if (Math.abs(submittedDiscount - expectedDiscount) > 0.02) {
        console.error(
          `[payment] kippot discount mismatch orderId=${orderId}`,
          `expected=${expectedDiscount} submitted=${submittedDiscount}`,
        );
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת הכיפות' }, { status: 400 });
      }
    }

    // ── Server-side print discount validation ────────────────────────────────
    const printItems = items.filter(i => i.name.includes('הדפסה') && !i.name.includes('הנחת'));
    const printQty   = printItems.reduce((s, i) => s + i.quantity, 0);

    if (printQty >= PRINT_DISCOUNT_QTY) {
      const printOriginal      = printItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const expectedPrintDisc  = Math.round(printOriginal * PRINT_DISCOUNT_RATE * 100) / 100;
      const printDiscountLine  = items.find(i => i.name.includes('הנחת הדפסה'));
      const submittedPrintDisc = printDiscountLine ? -printDiscountLine.price : 0;

      if (Math.abs(submittedPrintDisc - expectedPrintDisc) > 0.02) {
        console.error(
          `[payment] print discount mismatch orderId=${orderId}`,
          `expected=${expectedPrintDisc} submitted=${submittedPrintDisc}`,
        );
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת ההדפסה' }, { status: 400 });
      }
    }

    // ── Server-side bundle promo validation (NforX) ───────────────────────────
    // Group product items (non-discount lines) by bundlePromo key.
    const productItems = items.filter(i => !i.name.includes('הנחת') && !i.name.includes('משלוח'));

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
        console.error(
          `[payment] bundle discount mismatch orderId=${orderId}`,
          `expected=${expectedBundleDiscount} submitted=${submittedBundleDisc}`,
        );
        return NextResponse.json({ error: 'שגיאה בחישוב הנחת חבילות הכיפות' }, { status: 400 });
      }
    }

    // ── Build Sumit payload (strip internal fields) ───────────────────────────
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

    const response = await fetch(SUMIT_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await response.json();

    if (data?.Data?.RedirectURL) {
      return NextResponse.json({ url: data.Data.RedirectURL });
    } else {
      console.error('Sumit error:', JSON.stringify(data));
      return NextResponse.json({ error: 'שגיאה בקבלת דף תשלום' }, { status: 500 });
    }
  } catch (e) {
    console.error('Payment route error:', e);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
