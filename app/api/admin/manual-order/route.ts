import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { closeLeadForOrder } from '@/lib/crm';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/manual-order
//
// יצירת הזמנה שבוצעה מחוץ לאתר (וואטסאפ / טלפון / פנים מול פנים) ושולמה
// בביט, בהעברה בנקאית או במזומן.
//
// למה באותו collection 'orders' ולא בנפרד:
//   ProfitabilityTab, BestSellersTab, InventoryTab, analytics, CRM ו-loyalty
//   כולם קוראים מ-orders. collection נפרד היה מחייב לשכפל את כולם.
//   status='paid' כבר נמצא ב-PAID_STATUSES (app/lib/orderStatus.ts) ולכן
//   ההזמנה נספרת כהכנסה בכל הדוחות באופן אוטומטי, בלי שינוי בהם.
//
// מה שמבדיל הזמנה ידנית מהזמנת אתר:
//   source        'manual'  — לסינון בדוחות מול ROAS של גוגל אדס
//   paymentMethod 'bit' | 'bank_transfer' | 'cash' | 'other'
//   channel       'whatsapp' | 'phone' | 'in_person' | 'other'
//   receiptIssued false     — Sumit מנפיק קבלה אוטומטית רק בחיוב אשראי.
//                             בהזמנה ידנית חייבים להנפיק קבלה בנפרד.
//
// ⚠️ הזמנה ידנית לא יורה קונברז'ן לגוגל אדס / מטא — היא לא עוברת בעמוד
//    התודה. זה נכון ומכוון: אסור לדווח רכישה שלא הגיעה מהמודעה.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

const PAYMENT_METHODS = new Set(['bit', 'bank_transfer', 'cash', 'other']);
const CHANNELS        = new Set(['whatsapp', 'phone', 'in_person', 'other']);

interface ManualItemInput {
  productId?: string | null;
  name?: string;
  price?: number;
  quantity?: number;
  notes?: string | null;
}

interface ManualOrderInput {
  customerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  apartment?: string;
  zipCode?: string;
  notes?: string;
  items?: ManualItemInput[];
  shippingCost?: number;
  shippingType?: string;
  paymentMethod?: string;
  paymentReference?: string;
  channel?: string;
  paidAt?: string;
  isPaid?: boolean;
  totalOverride?: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: NextRequest) {
  try {
    // ── אימות אדמין ───────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'חסר טוקן הרשאה' }, { status: 401 });
    }
    const decoded = await verifyAdminToken(idToken);
    if (!decoded) {
      return NextResponse.json({ error: 'נדרשת הרשאת אדמין' }, { status: 403 });
    }

    const body = (await req.json()) as ManualOrderInput;

    // ── ולידציה ───────────────────────────────────────────────────────────
    const customerName = (body.customerName ?? '').trim();
    const phone        = (body.phone ?? '').trim();
    if (!customerName) {
      return NextResponse.json({ error: 'חסר שם לקוח' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'חסר טלפון — נדרש לזיהוי הלקוח ולסגירת ליד ב-CRM' }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .map(i => ({
        id:          (i.productId ?? '').trim() || `manual-${Math.random().toString(36).slice(2, 10)}`,
        productId:   (i.productId ?? '').trim() || null,
        name:        (i.name ?? '').trim(),
        productName: (i.name ?? '').trim(),
        price:       Number(i.price) || 0,
        quantity:    Math.max(1, Math.floor(Number(i.quantity) || 1)),
        itemNotes:   (i.notes ?? '').trim() || null,
      }))
      .filter(i => i.name && i.price >= 0);

    if (items.length === 0) {
      return NextResponse.json({ error: 'חייב להיות לפחות פריט אחד עם שם ומחיר' }, { status: 400 });
    }

    const paymentMethod = (body.paymentMethod ?? '').trim();
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json(
        { error: 'אמצעי תשלום לא תקין (bit / bank_transfer / cash / other)' },
        { status: 400 },
      );
    }

    const channel = CHANNELS.has((body.channel ?? '').trim()) ? (body.channel as string).trim() : 'other';

    // ── חישוב סכום ────────────────────────────────────────────────────────
    const shippingCost = Math.max(0, Number(body.shippingCost) || 0);
    const itemsTotal   = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const computed     = round2(itemsTotal + shippingCost);

    // totalOverride — לתת לאדמין לקבע סכום שסוכם בפועל בוואטסאפ
    const override = body.totalOverride == null ? null : Number(body.totalOverride);
    if (override != null && (!Number.isFinite(override) || override < 0)) {
      return NextResponse.json({ error: 'סכום ידני לא תקין' }, { status: 400 });
    }
    const total = override != null ? round2(override) : computed;

    // ── תאריך תשלום ───────────────────────────────────────────────────────
    const isPaid = body.isPaid !== false; // ברירת מחדל: שולם
    let paidAtDate: Date | null = null;
    if (isPaid) {
      if (body.paidAt) {
        const d = new Date(body.paidAt);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'תאריך תשלום לא תקין' }, { status: 400 });
        }
        if (d.getTime() > Date.now() + 60_000) {
          return NextResponse.json({ error: 'תאריך תשלום לא יכול להיות בעתיד' }, { status: 400 });
        }
        paidAtDate = d;
      } else {
        paidAtDate = new Date();
      }
    }

    // אותו פורמט בדיוק כמו הזמנות האתר — כלום במורד הזרם לא נשבר
    const orderNumber = 'YS-' + Date.now().toString().slice(-8) + String(Math.floor(Math.random() * 900) + 100);

    const db = getAdminDb();

    // ── מניעת כפילות: אותו טלפון + אותו סכום ב-5 הדקות האחרונות ──────────
    const dupSince = new Date(Date.now() - 5 * 60_000);
    const dupSnap = await db
      .collection('orders')
      .where('phone', '==', phone)
      .where('source', '==', 'manual')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
      .catch(() => null); // חסר אינדקס — לא מפיל את היצירה

    if (dupSnap) {
      const dup = dupSnap.docs.find(d => {
        const data = d.data();
        const created = data.createdAt?.toDate?.();
        return created && created > dupSince && Math.abs((data.total ?? 0) - total) < 0.01;
      });
      if (dup) {
        return NextResponse.json(
          {
            error: `נוצרה כבר הזמנה ידנית זהה (${dup.data().orderNumber}) לפני פחות מ-5 דקות. אם זו הזמנה נוספת אמיתית — שנה משהו בסכום או המתן.`,
            duplicateOrderId: dup.id,
          },
          { status: 409 },
        );
      }
    }

    // ── יצירת ההזמנה ──────────────────────────────────────────────────────
    const orderRef = await db.collection('orders').add({
      orderNumber,
      customerName,
      phone,
      email: (body.email ?? '').trim() || '',
      address:     (body.address ?? '').trim(),
      city:        (body.city ?? '').trim(),
      street:      (body.street ?? '').trim(),
      houseNumber: (body.houseNumber ?? '').trim(),
      apartment:   (body.apartment ?? '').trim(),
      zipCode:     (body.zipCode ?? '').trim(),
      notes:       (body.notes ?? '').trim(),

      items,
      total,
      ...(override != null && override !== computed ? { totalBeforeOverride: computed } : {}),
      shippingCost,
      shippingType: (body.shippingType ?? '').trim() || 'regular',

      // status='paid' → נכנס אוטומטית ל-PAID_STATUSES ולכל דוחות ההכנסה.
      // 'pending' → מופיע בטאב ההזמנות אבל לא נספר כהכנסה עד שיסומן ששולם.
      status: isPaid ? 'paid' : 'pending',
      createdAt: FieldValue.serverTimestamp(),
      paidAt: paidAtDate ? paidAtDate : null,

      // ── שדות ההזמנה הידנית ──────────────────────────────────────────────
      source: 'manual',
      channel,
      paymentMethod,
      paymentReference: (body.paymentReference ?? '').trim() || null,
      manualCreatedBy: decoded.email ?? decoded.uid ?? 'admin',
      /** Sumit מנפיק קבלה רק בחיוב אשראי — כאן צריך להנפיק ידנית */
      receiptIssued: false,
      receiptNumber: null,

      account: 'business',

      // שדות שהזמנת אתר ממלאת — נשמרים ריקים כדי שהטיפוסים יישארו עקביים
      couponCode: null, couponDiscount: null, totalDiscount: null,
      shaliachRef: null, shaliachId: null, shaliachName: null,
      commissionPercent: 0, commissionAmount: 0,
      uid: null, guestId: null, sessionId: null, isGuest: true,
      loyaltyProcessed: false,
      pointsUsed: null, pointsDiscount: null, pointsRedeemed: false,
      attribution: null,
    });

    // ── CRM: סגירת ליד תואם (לא קריטי — לא מפיל את ההזמנה) ───────────────
    try {
      await closeLeadForOrder(db, phone, orderNumber, null);
    } catch (crmErr) {
      console.error('[manual-order] CRM lead close failed (non-fatal):', crmErr);
    }

    console.log('[manual-order] created', orderNumber, 'by', decoded.email, '·', paymentMethod, '·', total);

    return NextResponse.json({ success: true, orderId: orderRef.id, orderNumber, total });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[manual-order] unhandled:', err.message, err.stack);
    return NextResponse.json({ error: 'שגיאה ביצירת ההזמנה' }, { status: 500 });
  }
}
