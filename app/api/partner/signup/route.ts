import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/app/lib/rate-limit';
import type { SignupFormData, SignupResponse } from '@/app/lib/partner-signup-types';

// Validation helpers
function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone: string): boolean {
  // Basic Israeli phone format (e.g., 05X-XXX-XXXX, +972-5X-XXX-XXXX)
  // TODO: Tighten to specific area codes and network prefixes if needed in future
  return /^(\+972|0)[0-9]{1,2}-?[0-9]{3}-?[0-9]{4}$/.test(phone);
}

function validateBusinessName(name: string): boolean {
  return name.length >= 3 && name.length <= 100;
}

function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 50;
}

async function checkPartnerExists(db: ReturnType<typeof getAdminDb>, email: string): Promise<boolean> {
  try {
    const snap = await db.collection('partners')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();
    return !snap.empty;
  } catch (error) {
    console.error('[partner/signup] partner check failed:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── Rate Limiting ───────────────────────────────────────────────────────
    // 5 signups per hour per email
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`partner-signup:${ipAddress}`, 3600, 5);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `בדיקה מחדש בעוד ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)} דקות` },
        { status: 429 }
      );
    }

    const data = await req.json() as SignupFormData;

    // ── Input Validation ────────────────────────────────────────────────────
    const email = data.email?.toLowerCase().trim();
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'אימייל לא תקין' },
        { status: 400 }
      );
    }

    if (!data.businessName || !validateBusinessName(data.businessName)) {
      return NextResponse.json(
        { success: false, error: 'שם העסק חייב להיות בין 3-100 תווים' },
        { status: 400 }
      );
    }

    if (!data.firstName || !validateName(data.firstName)) {
      return NextResponse.json(
        { success: false, error: 'שם פרטי לא תקין' },
        { status: 400 }
      );
    }

    if (!data.lastName || !validateName(data.lastName)) {
      return NextResponse.json(
        { success: false, error: 'שם משפחה לא תקין' },
        { status: 400 }
      );
    }

    if (!data.phone || !validatePhone(data.phone)) {
      return NextResponse.json(
        { success: false, error: 'מספר טלפון לא תקין' },
        { status: 400 }
      );
    }

    if (!data.city || data.city.length < 2) {
      return NextResponse.json(
        { success: false, error: 'עיר לא תקינה' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // ── Block only if an actual partner account already exists ─────────────
    // A prior pending/rejected application with the same email is fine — the
    // applicant may be retrying after an abandoned or failed payment.
    const partnerExists = await checkPartnerExists(adminDb, email);

    if (partnerExists) {
      return NextResponse.json(
        { success: false, error: 'כבר קיימת חנות רשומה עם אימייל זה' },
        { status: 409 }
      );
    }

    // ── Create application ──────────────────────────────────────────────────
    const applicationRef = await adminDb.collection('partners_applications').add({
      email,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      city: data.city,
      businessType: data.businessType || null,
      businessId: data.businessId || null,
      taxId: data.taxId || null,

      status: 'pending',
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      approvedBy: null,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[partner/signup] New application created: ${applicationRef.id} (${email})`);

    const response: SignupResponse = {
      success: true,
      applicationId: applicationRef.id,
      message: 'ההרשמה התקבלה בהצלחה. נבדוק את הפרטים שלך ונחזור אליך בקרוב.',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/signup] error:', err.message, err.stack);
    return NextResponse.json(
      { success: false, error: 'שגיאה בעת ההרשמה' },
      { status: 500 }
    );
  }
}
