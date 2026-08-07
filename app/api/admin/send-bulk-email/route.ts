import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { buildUnsubscribeUrl } from '@/lib/unsubscribeToken';

export const dynamic = 'force-dynamic';

function injectUnsubscribeFooter(html: string, email: string): string {
  const url = buildUnsubscribeUrl(email);
  const footer = `
<div dir="rtl" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;text-align:center;font-size:11px;color:#aaa;font-family:Arial,sans-serif;">
  קיבלת מייל זה כי נרשמת לניוזלטר YourSofer.
  <br/>
  <a href="${url}" style="color:#aaa;text-decoration:underline;">להסרה מרשימת הדיוור — לחץ/י כאן</a>
</div>`;
  if (html.includes('</body>')) return html.replace('</body>', footer + '</body>');
  return html + footer;
}

async function getOptedOutEmails(
  db: ReturnType<typeof getAdminDb>,
  emails: string[]
): Promise<Set<string>> {
  const optedOut = new Set<string>();
  const normalized = emails.map(e => e.toLowerCase());
  // Firestore 'in' supports up to 30 values per query
  for (let i = 0; i < normalized.length; i += 30) {
    const chunk = normalized.slice(i, i + 30);
    const snap = await db.collection('leads').where('email', 'in', chunk).get();
    snap.forEach(d => {
      if (d.data().optOut === true) optedOut.add((d.data().email ?? '').toLowerCase());
    });
  }
  return optedOut;
}

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();

    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { recipients, subject, bodyHtml, templateId } = await req.json();
    if (!Array.isArray(recipients) || recipients.length === 0 || !subject || !bodyHtml) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Filter opted-out recipients before sending
    const validEmails = recipients.filter((e: unknown) => e && typeof e === 'string') as string[];
    const optedOutEmails = await getOptedOutEmails(adminDb, validEmails);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const email of recipients) {
      if (!email || typeof email !== 'string') { failed++; continue; }
      if (optedOutEmails.has(email.toLowerCase())) { skipped++; continue; }

      const unsubUrl = buildUnsubscribeUrl(email);
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'YourSofer <shop@your-sofer.com>',
            to: [email],
            subject,
            html: injectUnsubscribeFooter(bodyHtml, email),
            headers: {
              'List-Unsubscribe': `<${unsubUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });
        if (res.ok) sent++;
        else { failed++; console.error('[send-bulk-email] resend error', await res.text()); }
      } catch (e) {
        failed++;
        console.error('[send-bulk-email] fetch error', e);
      }
    }

    await adminDb.collection('sentEmails').add({
      to: recipients,
      subject,
      bodyHtml,
      sentAt: new Date(),
      status: failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial',
      templateId: templateId ?? null,
      skipped,
    });

    return NextResponse.json({ success: true, sent, failed, skipped });
  } catch (err: any) {
    console.error('[send-bulk-email]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminDb = getAdminDb();

    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const DEFAULT_TEMPLATES: Record<string, { subject: string; bodyHtml: string; isActive: boolean }> = {
      order_confirmation: {
        subject: 'אישור הזמנה מ-YourSofer',
        bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#3B3B41">
  <h2 style="color:#C5A028">תודה על הזמנתך! ✡️</h2>
  <p>שלום {{name}},</p>
  <p>קיבלנו את הזמנתך מספר <strong>{{orderNumber}}</strong> בהצלחה.</p>
  <p>סכום ההזמנה: <strong>{{total}}</strong></p>
  <p>נעדכן אותך כשההזמנה תצא לדרך.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
  <p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
        isActive: true,
      },
      cart_abandonment: {
        subject: 'שכחת משהו בעגלה 🛒',
        bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#3B3B41">
  <h2 style="color:#C5A028">שכחת משהו... 🛒</h2>
  <p>שלום {{name}},</p>
  <p>ראינו שהשארת פריטים בעגלה שלך. אנחנו שמרנו אותם בשבילך!</p>
  <p>חזור/י עכשיו ולהשלים את הרכישה לפני שהמלאי אוזל.</p>
  <div style="text-align:center;margin:30px 0">
    <a href="https://your-sofer.com/cart" style="background:#C5A028;color:#3B3B41;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
      המשך לעגלה שלי →
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
  <p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
        isActive: true,
      },
      newsletter_welcome: {
        subject: 'ברוך הבא ל-YourSofer! 🎉',
        bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#3B3B41">
  <h2 style="color:#C5A028">ברוך הבא ל-YourSofer! 🎉</h2>
  <p>שלום {{name}},</p>
  <p>אנחנו שמחים שהצטרפת אלינו! ב-YourSofer תמצא/י את מיטב הסופרים הסת"ם עם מגוון מוצרי יודאיקה איכותיים.</p>
  <p>מה תמצא/י אצלנו:</p>
  <ul>
    <li>קלפי מזוזה ותפילין מסופרים מוסמכים</li>
    <li>מגילות, ספרי תורה ועוד</li>
    <li>משלוח מהיר לכל הארץ</li>
  </ul>
  <div style="text-align:center;margin:30px 0">
    <a href="https://your-sofer.com" style="background:#3B3B41;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
      לחנות שלנו →
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
  <p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
        isActive: true,
      },
      custom_update: {
        subject: 'עדכון מ-YourSofer',
        bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#3B3B41">
  <h2 style="color:#C5A028">עדכון חשוב מ-YourSofer</h2>
  <p>שלום {{name}},</p>
  <p>{{message}}</p>
  <div style="text-align:center;margin:30px 0">
    <a href="https://your-sofer.com" style="background:#C5A028;color:#3B3B41;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
      לאתר שלנו →
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
  <p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
        isActive: true,
      },
      club_invitation: {
        subject: 'הוזמנת למועדון הפרימיום של Your Sofer — 10% חזרה על כל קנייה 🎁',
        bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111d3a">
<a href="https://your-sofer.com/club" style="display:block">
  <img src="https://your-sofer.com/club-og.jpg" alt="הצטרפו למועדון Your Sofer" style="width:100%;display:block;border-radius:12px"/>
</a>
<h2 style="color:#C5A028;margin-top:24px">מקומך במועדון הפרימיום שלנו שמור 🎁</h2>
<p>שלום,</p>
<p>כלקוח/ה וחבר/ה של <strong>Your Sofer</strong> — רצינו להזמין אותך אישית להצטרף בחינם למועדון הלקוחות שלנו.</p>
<table dir="rtl" style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px 0;font-size:15px">💰 <strong>10% חזרה בנקודות</strong> על כל קנייה — כל נקודה שווה 1 ₪ לקנייה הבאה</td></tr>
  <tr><td style="padding:8px 0;font-size:15px">⏪ <strong>נקודות רטרואקטיביות</strong> — גם על רכישות שכבר ביצעת! רכשת ב-700 ₪? תקבל/י 70 נקודות בשווי 70 ₪</td></tr>
  <tr><td style="padding:8px 0;font-size:15px">🏷️ <strong>מבצעים והטבות בלעדיות</strong> לחברי מועדון בלבד</td></tr>
  <tr><td style="padding:8px 0;font-size:15px">✡️ מגוון ענק של סת"ם ויודאיקה — עם שירות אישי</td></tr>
</table>
<div style="text-align:center;margin:30px 0">
  <a href="https://your-sofer.com/club" style="background:#C5A028;color:#111d3a;padding:16px 40px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:17px;display:inline-block">
    הצטרפות בחינם בלחיצה אחת ←
  </a>
</div>
<p style="font-size:13px;color:#666;text-align:center">ההצטרפות עם חשבון Google — שניות ואתם בפנים, והנקודות על רכישות העבר נכנסות מיד.</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:12px;color:#888;text-align:center">YourSofer — יודאיקה בסטנדרט הגבוה ביותר · your-sofer.com</p>
</div>`,
        isActive: true,
      },
    };

    const results: Record<string, boolean> = {};
    for (const [id, data] of Object.entries(DEFAULT_TEMPLATES)) {
      const docRef = adminDb.collection('emailTemplates').doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({ ...data, updatedAt: new Date() });
        results[id] = true;
      } else {
        results[id] = false;
      }
    }

    return NextResponse.json({ seeded: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
